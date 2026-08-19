import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Procedure = Database["public"]["Tables"]["procedures"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Patient = Database["public"]["Tables"]["patients"]["Row"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  recepcao: "Recepção",
  profissional: "Profissional",
  financeiro: "Financeiro",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  interessado: "Interessado",
  avaliacao_agendada: "Avaliação agendada",
  avaliacao_realizada: "Avaliação realizada",
  proposta: "Proposta",
  convertido: "Convertido",
  perdido: "Perdido",
};

export type ClinicContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  clinic: Clinic | null;
  roles: AppRole[];
};

/** Contexto do usuário: perfil, clínica e papéis. A clínica vem sempre do banco. */
export async function fetchClinicContext(): Promise<ClinicContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sessão expirada. Entre novamente.");
  const user = userData.user;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  if (!profile) {
    return { userId: user.id, email: user.email ?? null, profile: null, clinic: null, roles: [] };
  }

  const [clinicResult, rolesResult] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", profile.clinic_id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  if (clinicResult.error) throw new Error(clinicResult.error.message);
  if (rolesResult.error) throw new Error(rolesResult.error.message);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    clinic: clinicResult.data,
    roles: (rolesResult.data ?? []).map((r) => r.role),
  };
}

export function isManager(roles: AppRole[]) {
  return roles.includes("admin") || roles.includes("gestor");
}

/** Cria clínica + perfil + papel Admin + dados de demonstração (idempotente). */
export async function bootstrapClinic(clinicName: string, fullName: string) {
  const { data, error } = await supabase.rpc("bootstrap_clinic", {
    p_clinic_name: clinicName,
    p_full_name: fullName,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchProcedures() {
  const { data, error } = await supabase
    .from("procedures")
    .select("*")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMembers() {
  const [profiles, roles] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  if (roles.error) throw new Error(roles.error.message);

  return (profiles.data ?? []).map((profile) => ({
    ...profile,
    roles: (roles.data ?? []).filter((r) => r.user_id === profile.id).map((r) => r.role),
  }));
}

export type DashboardData = {
  leadsWithoutContact: Lead[];
  overdueFollowups: Lead[];
  openLeads: number;
  patientCount: number;
  procedureCount: number;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const nowIso = new Date().toISOString();
  const [noContact, overdue, open, patients, procedures] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .is("last_contact_at", null)
      .not("status", "in", "(convertido,perdido)")
      .order("created_at")
      .limit(10),
    supabase
      .from("leads")
      .select("*")
      .lt("next_followup_at", nowIso)
      .not("status", "in", "(convertido,perdido)")
      .order("next_followup_at")
      .limit(10),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(convertido,perdido)"),
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase.from("procedures").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const firstError =
    noContact.error ?? overdue.error ?? open.error ?? patients.error ?? procedures.error;
  if (firstError) throw new Error(firstError.message);

  return {
    leadsWithoutContact: noContact.data ?? [],
    overdueFollowups: overdue.data ?? [],
    openLeads: open.count ?? 0,
    patientCount: patients.count ?? 0,
    procedureCount: procedures.count ?? 0,
  };
}
