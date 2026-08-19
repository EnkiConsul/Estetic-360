CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'nota',
  note text,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_activities_kind_check CHECK (kind IN ('ligacao','whatsapp','email','mensagem','visita','nota','status','conversao'))
);

CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, happened_at DESC);
CREATE INDEX lead_activities_clinic_idx ON public.lead_activities (clinic_id, happened_at DESC);

GRANT SELECT, INSERT ON public.lead_activities TO authenticated;
GRANT ALL ON public.lead_activities TO service_role;

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY lead_activities_select_same_clinic ON public.lead_activities
  FOR SELECT TO authenticated
  USING (clinic_id = public.current_clinic_id());

CREATE POLICY lead_activities_insert_same_clinic ON public.lead_activities
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id());

CREATE OR REPLACE FUNCTION public.convert_lead_to_patient(p_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_clinic uuid := public.current_clinic_id();
  v_lead public.leads;
  v_patient uuid;
BEGIN
  IF v_user IS NULL OR v_clinic IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id AND clinic_id = v_clinic;
  IF v_lead.id IS NULL THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;

  IF v_lead.converted_patient_id IS NOT NULL THEN
    RETURN v_lead.converted_patient_id;
  END IF;

  INSERT INTO public.patients (clinic_id, name, phone, email, source, campaign, notes)
  VALUES (v_clinic, v_lead.name, v_lead.phone, v_lead.email, v_lead.source, v_lead.campaign,
          nullif(concat_ws(' ', 'Convertido do CRM.', nullif('Interesse: ' || coalesce(v_lead.interest, ''), 'Interesse: ')), ''))
  RETURNING id INTO v_patient;

  UPDATE public.leads
     SET status = 'convertido',
         converted_patient_id = v_patient,
         last_contact_at = now(),
         next_followup_at = NULL
   WHERE id = p_lead_id;

  INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, created_by)
  VALUES (v_clinic, p_lead_id, 'conversao', 'Lead convertido em paciente.', v_user);

  RETURN v_patient;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_lead_to_patient(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_patient(uuid) TO authenticated;