import { useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchClinicTeam } from "@/lib/clinic-data";
import {
  fetchCrmPendings,
  fetchLeadActivities,
  fetchLeads,
  type LeadFilters,
} from "@/lib/crm-data";

export type MemberOption = { id: string; name: string; role: string };

export const crmKeys = {
  leads: (clinicId: string | undefined, filters: LeadFilters) =>
    ["crm", "leads", clinicId, filters] as const,
  activities: (leadId: string | undefined) => ["crm", "activities", leadId] as const,
  pendings: (clinicId: string | undefined) => ["crm", "pendings", clinicId] as const,
  team: (clinicId: string | undefined) => ["clinic-team", clinicId] as const,
};

export function useLeads(clinicId: string | undefined, filters: LeadFilters) {
  return useQuery({
    queryKey: crmKeys.leads(clinicId, filters),
    queryFn: () => fetchLeads(clinicId!, filters),
    enabled: Boolean(clinicId),
  });
}

export function useLeadActivities(leadId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.activities(leadId),
    queryFn: () => fetchLeadActivities(leadId!),
    enabled: Boolean(leadId),
  });
}

export function useCrmPendings(clinicId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.pendings(clinicId),
    queryFn: () => fetchCrmPendings(clinicId!),
    enabled: Boolean(clinicId),
  });
}

export function useClinicTeamOptions(clinicId: string | undefined) {
  return useQuery({
    queryKey: crmKeys.team(clinicId),
    queryFn: async (): Promise<MemberOption[]> => {
      const team = await fetchClinicTeam(clinicId!);
      return team
        .filter((member) => member.is_active && member.role !== "financeiro")
        .map((member) => ({
          id: member.id,
          name: member.profile?.full_name || member.profile?.email || "Sem nome",
          role: member.role,
        }));
    },
    enabled: Boolean(clinicId),
  });
}

/** Invalida tudo que depende do CRM depois de uma escrita. */
export function useInvalidateCrm() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["crm"] });
  };
}
