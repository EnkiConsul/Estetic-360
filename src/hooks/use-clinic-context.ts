import { useQuery } from "@tanstack/react-query";

import { fetchClinicContext } from "@/lib/clinic-data";

export const clinicContextKey = ["clinic-context"] as const;

export function useClinicContext() {
  return useQuery({
    queryKey: clinicContextKey,
    queryFn: fetchClinicContext,
    staleTime: 60_000,
  });
}
