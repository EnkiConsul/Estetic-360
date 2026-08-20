ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_converted_patient_key;
DROP INDEX IF EXISTS public.leads_converted_patient_key;
CREATE INDEX IF NOT EXISTS leads_converted_patient_idx ON public.leads (converted_patient_id) WHERE converted_patient_id IS NOT NULL;