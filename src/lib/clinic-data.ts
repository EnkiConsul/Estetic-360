import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Clinic = Database["public"]["Tables"]["clinics"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ClinicMember = Database["public"]["Tables"]["clinic_members"]["Row"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  gestor: "Gestor",
  recepcao: "Recepção",
  profissional: "Profissional",
  financeiro: "Financeiro",
};

export type Membership = {
  membershipId: string;
  role: AppRole;
  isActive: boolean;
  clinic: Clinic;
};

export type ClinicContext = {
  userId: string;
  email: string | null;
  profile: Profile | null;
  memberships: Membership[];
  activeClinic: Clinic | null;
  activeRole: AppRole | null;
};

/**
 * Contexto do usuário: perfil global + vínculos ativos (clinic_members).
 * A autorização real acontece na RLS; aqui só montamos a visão do frontend.
 */
export async function fetchClinicContext(): Promise<ClinicContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error("Sessão expirada. Entre novamente.");
  const user = userData.user;

  const [profileResult, membersResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("clinic_members")
      .select("id, role, is_active, clinic:clinics(*)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at"),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);

  const memberships: Membership[] = (membersResult.data ?? [])
    .filter((row): row is typeof row & { clinic: Clinic } => row.clinic !== null)
    .map((row) => ({
      membershipId: row.id,
      role: row.role,
      isActive: row.is_active,
      clinic: row.clinic,
    }));

  const profile = profileResult.data ?? null;
  const preferred = profile?.active_clinic_id
    ? memberships.find((m) => m.clinic.id === profile.active_clinic_id)
    : undefined;
  const active = preferred ?? memberships[0] ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
    memberships,
    activeClinic: active?.clinic ?? null,
    activeRole: active?.role ?? null,
  };
}

export function isManager(role: AppRole | null) {
  return role === "admin" || role === "gestor";
}

/** Onboarding atômico: cria clínica + perfil + vínculo Admin. Idempotente. */
export async function createClinicWithAdmin(clinicName: string, fullName: string) {
  const { data, error } = await supabase.rpc("create_clinic_with_admin", {
    p_clinic_name: clinicName,
    p_full_name: fullName,
  });
  if (error) throw new Error(error.message);
  return data;
}

/** Equipe da clínica ativa, sempre derivada de clinic_members. */
export async function fetchClinicTeam(clinicId: string) {
  const { data: members, error } = await supabase
    .from("clinic_members")
    .select("id, role, is_active, user_id")
    .eq("clinic_id", clinicId)
    .order("created_at");
  if (error) throw new Error(error.message);

  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);
  if (profilesError) throw new Error(profilesError.message);

  return (members ?? []).map((member) => ({
    ...member,
    profile: (profiles ?? []).find((p) => p.id === member.user_id) ?? null,
  }));
}
