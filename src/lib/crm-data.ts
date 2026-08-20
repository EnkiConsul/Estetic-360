import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadActivityKind = Database["public"]["Enums"]["lead_activity_kind"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadActivity = Database["public"]["Tables"]["lead_activities"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];

/** Estágios do pipeline — única fonte de verdade da interface. */
export const LEAD_STATUSES: readonly LeadStatus[] = [
  "novo",
  "em_contato",
  "interessado",
  "avaliacao_agendada",
  "avaliacao_realizada",
  "proposta",
  "convertido",
  "perdido",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  interessado: "Interessado",
  avaliacao_agendada: "Avaliação agendada",
  avaliacao_realizada: "Avaliação realizada",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Perdido",
};

/** Estágios terminais: não geram pendência e não são escolhidos livremente. */
export const TERMINAL_STATUSES: readonly LeadStatus[] = ["convertido", "perdido"];

/** Estágios selecionáveis manualmente (convertido só pela ação de conversão). */
export const SELECTABLE_STATUSES: readonly LeadStatus[] = LEAD_STATUSES.filter(
  (status) => status !== "convertido",
);

export const CONTACT_KINDS: readonly Extract<
  LeadActivityKind,
  "ligacao" | "whatsapp" | "email" | "nota"
>[] = ["ligacao", "whatsapp", "email", "nota"];

export const ACTIVITY_KIND_LABELS: Record<LeadActivityKind, string> = {
  criacao: "Lead criado",
  nota: "Nota",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  status: "Mudança de etapa",
  followup: "Follow-up",
  perda: "Perda",
  reabertura: "Reabertura",
  conversao: "Conversão",
};

export const LEAD_SOURCES = [
  "Instagram",
  "Facebook",
  "Google",
  "WhatsApp",
  "Indicação",
  "Site",
  "Outro",
] as const;

/** Espelha public.normalize_phone — usada apenas para busca no cliente. */
export function normalizePhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/[^0-9]/g, "");
  const stripped =
    (digits.length === 12 || digits.length === 13) && digits.startsWith("55")
      ? digits.slice(2)
      : digits;
  return stripped || null;
}

export function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase() || null;
}

export function isTerminal(status: LeadStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export type FollowupState = "atrasado" | "hoje" | "futuro" | "sem";

export function followupState(lead: Pick<Lead, "status" | "next_followup_at">): FollowupState {
  if (!lead.next_followup_at || isTerminal(lead.status)) return "sem";
  const date = new Date(lead.next_followup_at);
  const now = new Date();
  if (date.getTime() < now.getTime()) return "atrasado";
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return date.getTime() <= endOfDay.getTime() ? "hoje" : "futuro";
}

export function isOverdue(lead: Pick<Lead, "status" | "next_followup_at">) {
  return followupState(lead) === "atrasado";
}

export function needsFirstContact(lead: Pick<Lead, "status" | "last_contact_at">) {
  return lead.last_contact_at === null && !isTerminal(lead.status);
}

export function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toLocalInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Traduz erros do backend em mensagens compreensíveis. */
export function friendlyError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (!raw) return "Não foi possível concluir a ação. Tente novamente.";
  const technical =
    /permission denied|violates|constraint|policy|row-level|RLS|function |syntax|JWT|schema|duplicate key/i;
  if (technical.test(raw)) {
    if (/leads_contact_required/i.test(raw)) return "Informe telefone ou e-mail.";
    if (/leads_loss_reason_required/i.test(raw)) return "Informe o motivo da perda.";
    if (/duplicate key/i.test(raw)) return "Esse registro já existe.";
    return "Não foi possível concluir a ação. Verifique os dados e suas permissões.";
  }
  return raw;
}

// ---------------------------------------------------------------- leitura

export type LeadFilters = {
  search?: string;
  status?: LeadStatus | "todos";
  assignedMemberId?: string | "todos";
  source?: string | "todos";
  quick?: "todos" | "followup_vencido" | "sem_contato";
};

const LEADS_PAGE_SIZE = 200;

export async function fetchLeads(clinicId: string, filters: LeadFilters = {}) {
  let query = supabase
    .from("leads")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("updated_at", { ascending: false })
    .limit(LEADS_PAGE_SIZE);

  if (filters.status && filters.status !== "todos") query = query.eq("status", filters.status);
  if (filters.assignedMemberId && filters.assignedMemberId !== "todos") {
    query = query.eq("assigned_member_id", filters.assignedMemberId);
  }
  if (filters.source && filters.source !== "todos") query = query.eq("source", filters.source);
  if (filters.quick === "followup_vencido") {
    query = query
      .lt("next_followup_at", new Date().toISOString())
      .not("status", "in", "(convertido,perdido)");
  }
  if (filters.quick === "sem_contato") {
    query = query.is("last_contact_at", null).not("status", "in", "(convertido,perdido)");
  }

  const term = (filters.search ?? "").trim();
  if (term) {
    const parts = [`name.ilike.%${term}%`];
    const phone = normalizePhone(term);
    if (phone) parts.push(`phone_normalized.ilike.%${phone}%`);
    const email = normalizeEmail(term);
    if (email) parts.push(`email_normalized.ilike.%${email}%`);
    query = query.or(parts.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(friendlyError(new Error(error.message)));
  return data ?? [];
}

export async function fetchLeadActivities(leadId: string) {
  const { data, error } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("happened_at", { ascending: false });
  if (error) throw new Error(friendlyError(new Error(error.message)));
  return data ?? [];
}

export type CrmPendings = {
  withoutContact: Lead[];
  overdue: Lead[];
  today: Lead[];
};

export async function fetchCrmPendings(clinicId: string): Promise<CrmPendings> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("clinic_id", clinicId)
    .not("status", "in", "(convertido,perdido)")
    .order("next_followup_at", { ascending: true, nullsFirst: false })
    .limit(LEADS_PAGE_SIZE);
  if (error) throw new Error(friendlyError(new Error(error.message)));
  const leads = data ?? [];
  return {
    withoutContact: leads.filter(needsFirstContact),
    overdue: leads.filter((lead) => followupState(lead) === "atrasado"),
    today: leads.filter((lead) => followupState(lead) === "hoje"),
  };
}

// ---------------------------------------------------------------- escrita (RPC)

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  interest: string;
  source: string;
  campaign: string;
  assignedMemberId: string | null;
  nextFollowupAt: string | null;
};

/** Args opcionais precisam ser omitidos (não `undefined`) para cair no DEFAULT NULL do RPC. */
function optionalArgs(input: LeadInput) {
  return {
    ...(input.phone ? { p_phone: input.phone } : {}),
    ...(input.email ? { p_email: input.email } : {}),
    ...(input.interest ? { p_interest: input.interest } : {}),
    ...(input.source ? { p_source: input.source } : {}),
    ...(input.campaign ? { p_campaign: input.campaign } : {}),
    ...(input.assignedMemberId ? { p_assigned_member_id: input.assignedMemberId } : {}),
    ...(input.nextFollowupAt ? { p_next_followup_at: input.nextFollowupAt } : {}),
  };
}

export async function createLead(clinicId: string, input: LeadInput) {
  const { data, error } = await supabase.rpc("create_lead", {
    p_clinic_id: clinicId,
    p_name: input.name,
    ...optionalArgs(input),
  });
  if (error) throw new Error(friendlyError(new Error(error.message)));
  return data;
}

export async function updateLead(leadId: string, input: LeadInput) {
  const { error } = await supabase.rpc("update_lead", {
    p_lead_id: leadId,
    p_name: input.name,
    ...optionalArgs(input),
  });
  if (error) throw new Error(friendlyError(new Error(error.message)));
}

export async function registerLeadContact(params: {
  leadId: string;
  kind: LeadActivityKind;
  note: string;
  nextFollowupAt: string | null;
  newStatus: LeadStatus | null;
}) {
  const { error } = await supabase.rpc("register_lead_contact", {
    p_lead_id: params.leadId,
    p_kind: params.kind,
    ...(params.note ? { p_note: params.note } : {}),
    ...(params.nextFollowupAt ? { p_next_followup_at: params.nextFollowupAt } : {}),
    ...(params.newStatus ? { p_new_status: params.newStatus } : {}),
  });
  if (error) throw new Error(friendlyError(new Error(error.message)));
}

export async function changeLeadStatus(params: {
  leadId: string;
  newStatus: LeadStatus;
  note?: string;
  lossReason?: string;
  nextFollowupAt?: string | null;
}) {
  const { error } = await supabase.rpc("change_lead_status", {
    p_lead_id: params.leadId,
    p_new_status: params.newStatus,
    ...(params.note ? { p_note: params.note } : {}),
    ...(params.lossReason ? { p_loss_reason: params.lossReason } : {}),
    ...(params.nextFollowupAt ? { p_next_followup_at: params.nextFollowupAt } : {}),
  });
  if (error) throw new Error(friendlyError(new Error(error.message)));
}

export type PatientCandidate = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  match_reason: string;
};

export type ConversionResult =
  | { status: "converted"; patient_id: string }
  | { status: "already_converted"; patient_id: string }
  | { status: "duplicates"; candidates: PatientCandidate[] };

export async function convertLeadToPatient(params: {
  leadId: string;
  patientId?: string | null;
  forceNew?: boolean;
}): Promise<ConversionResult> {
  const { data, error } = await supabase.rpc("convert_lead_to_patient", {
    p_lead_id: params.leadId,
    p_force_new: params.forceNew ?? false,
    ...(params.patientId ? { p_patient_id: params.patientId } : {}),
  });
  if (error) throw new Error(friendlyError(new Error(error.message)));
  return data as unknown as ConversionResult;
}
