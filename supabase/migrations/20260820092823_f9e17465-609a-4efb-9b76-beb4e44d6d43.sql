ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_origin_lead_fk;
ALTER TABLE public.patients
  ADD CONSTRAINT patients_origin_lead_fk
  FOREIGN KEY (origin_lead_id) REFERENCES public.leads(id) ON DELETE SET NULL (origin_lead_id);