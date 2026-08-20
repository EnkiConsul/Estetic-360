-- =========================================================
-- FASE 1 — CRM & LEADS
-- =========================================================

CREATE TYPE public.lead_status AS ENUM (
  'novo','em_contato','interessado','avaliacao_agendada',
  'avaliacao_realizada','proposta','convertido','perdido'
);

CREATE TYPE public.lead_activity_kind AS ENUM (
  'criacao','nota','ligacao','whatsapp','email','status',
  'followup','perda','reabertura','conversao'
);

-- ---------- normalização (backend, imutável) ----------
CREATE OR REPLACE FUNCTION public.normalize_phone(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(
    CASE
      WHEN length(d.v) IN (12, 13) AND left(d.v, 2) = '55' THEN substr(d.v, 3)
      ELSE d.v
    END, '')
  FROM (SELECT regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g') AS v) d;
$$;

CREATE OR REPLACE FUNCTION public.normalize_email(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(lower(btrim(coalesce(p_value, ''))), '');
$$;

-- composite key para FKs multiempresa
ALTER TABLE public.clinic_members ADD CONSTRAINT clinic_members_id_clinic_key UNIQUE (id, clinic_id);

-- ---------- patients (estrutura mínima) ----------
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  cpf text,
  phone text,
  phone_normalized text GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  email text,
  email_normalized text GENERATED ALWAYS AS (public.normalize_email(email)) STORED,
  source text,
  campaign text,
  origin_lead_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT patients_id_clinic_key UNIQUE (id, clinic_id)
);

CREATE UNIQUE INDEX patients_clinic_cpf_key ON public.patients (clinic_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX patients_clinic_phone_idx ON public.patients (clinic_id, phone_normalized);
CREATE INDEX patients_clinic_email_idx ON public.patients (clinic_id, email_normalized);

-- ---------- leads ----------
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  phone_normalized text GENERATED ALWAYS AS (public.normalize_phone(phone)) STORED,
  email text,
  email_normalized text GENERATED ALWAYS AS (public.normalize_email(email)) STORED,
  interest text,
  source text,
  campaign text,
  assigned_member_id uuid,
  status public.lead_status NOT NULL DEFAULT 'novo',
  next_followup_at timestamptz,
  last_contact_at timestamptz,
  loss_reason text,
  converted_patient_id uuid,
  created_by_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_name_not_blank CHECK (btrim(name) <> ''),
  CONSTRAINT leads_contact_required CHECK (
    public.normalize_phone(phone) IS NOT NULL OR public.normalize_email(email) IS NOT NULL
  ),
  CONSTRAINT leads_loss_reason_required CHECK (
    status <> 'perdido' OR nullif(btrim(coalesce(loss_reason, '')), '') IS NOT NULL
  ),
  CONSTRAINT leads_converted_requires_patient CHECK (
    status <> 'convertido' OR converted_patient_id IS NOT NULL
  ),
  CONSTRAINT leads_id_clinic_key UNIQUE (id, clinic_id),
  CONSTRAINT leads_assigned_member_fk FOREIGN KEY (assigned_member_id, clinic_id)
    REFERENCES public.clinic_members (id, clinic_id) ON DELETE SET NULL,
  CONSTRAINT leads_created_by_member_fk FOREIGN KEY (created_by_member_id, clinic_id)
    REFERENCES public.clinic_members (id, clinic_id) ON DELETE SET NULL,
  CONSTRAINT leads_patient_fk FOREIGN KEY (converted_patient_id, clinic_id)
    REFERENCES public.patients (id, clinic_id) ON DELETE RESTRICT
);

-- 1 lead -> no máximo 1 paciente convertido (e nunca 2 pacientes para o mesmo lead)
CREATE UNIQUE INDEX leads_converted_patient_key ON public.leads (converted_patient_id)
  WHERE converted_patient_id IS NOT NULL;
CREATE INDEX leads_clinic_status_idx ON public.leads (clinic_id, status);
CREATE INDEX leads_clinic_followup_idx ON public.leads (clinic_id, next_followup_at);
CREATE INDEX leads_clinic_assigned_idx ON public.leads (clinic_id, assigned_member_id);
CREATE INDEX leads_clinic_phone_idx ON public.leads (clinic_id, phone_normalized);
CREATE INDEX leads_clinic_email_idx ON public.leads (clinic_id, email_normalized);

ALTER TABLE public.patients
  ADD CONSTRAINT patients_origin_lead_fk FOREIGN KEY (origin_lead_id, clinic_id)
  REFERENCES public.leads (id, clinic_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX patients_origin_lead_key ON public.patients (origin_lead_id)
  WHERE origin_lead_id IS NOT NULL;

-- ---------- lead_activities ----------
CREATE TABLE public.lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  kind public.lead_activity_kind NOT NULL,
  note text,
  previous_status public.lead_status,
  new_status public.lead_status,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_by_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_activities_lead_fk FOREIGN KEY (lead_id, clinic_id)
    REFERENCES public.leads (id, clinic_id) ON DELETE CASCADE,
  CONSTRAINT lead_activities_member_fk FOREIGN KEY (created_by_member_id, clinic_id)
    REFERENCES public.clinic_members (id, clinic_id) ON DELETE SET NULL
);

CREATE INDEX lead_activities_lead_idx ON public.lead_activities (lead_id, happened_at DESC);
CREATE INDEX lead_activities_clinic_idx ON public.lead_activities (clinic_id, happened_at DESC);

-- ---------- updated_at (reutiliza set_updated_at da fundação) ----------
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Autorização (membership based)
-- =========================================================

-- id do meu vínculo ativo na clínica
CREATE OR REPLACE FUNCTION public.my_membership_id(p_clinic_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cm.id FROM public.clinic_members cm
  WHERE cm.clinic_id = p_clinic_id AND cm.user_id = auth.uid() AND cm.is_active
  LIMIT 1
$$;

-- acesso operacional completo ao CRM
CREATE OR REPLACE FUNCTION public.has_crm_full_access(p_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = p_clinic_id AND cm.user_id = auth.uid() AND cm.is_active
      AND cm.role IN ('admin','gestor','recepcao')
  )
$$;

-- profissional: acesso somente aos leads atribuídos
CREATE OR REPLACE FUNCTION public.is_clinic_professional(p_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.clinic_id = p_clinic_id AND cm.user_id = auth.uid() AND cm.is_active
      AND cm.role = 'profissional'
  )
$$;

REVOKE ALL ON FUNCTION public.my_membership_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_crm_full_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_clinic_professional(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_membership_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_crm_full_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_professional(uuid) TO authenticated;

-- =========================================================
-- GRANTS: leitura direta; escrita somente por RPC
-- =========================================================
GRANT SELECT ON public.leads TO authenticated;
GRANT SELECT ON public.lead_activities TO authenticated;
GRANT SELECT ON public.patients TO authenticated;
GRANT ALL ON public.leads TO service_role;
GRANT ALL ON public.lead_activities TO service_role;
GRANT ALL ON public.patients TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_select_crm ON public.leads
  FOR SELECT TO authenticated
  USING (
    public.has_crm_full_access(clinic_id)
    OR (public.is_clinic_professional(clinic_id)
        AND assigned_member_id = public.my_membership_id(clinic_id))
  );

CREATE POLICY lead_activities_select_crm ON public.lead_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_activities.lead_id)
  );

CREATE POLICY patients_select_crm ON public.patients
  FOR SELECT TO authenticated
  USING (public.has_crm_full_access(clinic_id) OR public.is_clinic_professional(clinic_id));

-- =========================================================
-- RPCs (SECURITY DEFINER: precisam validar identidade via auth.uid(),
-- gravar histórico e garantir atomicidade — writes diretos não são concedidos)
-- =========================================================

-- contexto do usuário no CRM da clínica
CREATE OR REPLACE FUNCTION public.crm_context(p_clinic_id uuid, OUT o_member_id uuid, OUT o_role public.app_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT cm.id, cm.role INTO o_member_id, o_role
  FROM public.clinic_members cm
  WHERE cm.clinic_id = p_clinic_id AND cm.user_id = auth.uid() AND cm.is_active
  LIMIT 1;
  IF o_member_id IS NULL THEN RAISE EXCEPTION 'Você não tem acesso a esta clínica'; END IF;
  IF o_role = 'financeiro' THEN RAISE EXCEPTION 'Seu perfil não tem acesso ao CRM'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.crm_context(uuid) FROM PUBLIC, anon;

-- criar lead + atividade inicial (atômico)
CREATE OR REPLACE FUNCTION public.create_lead(
  p_clinic_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_interest text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_campaign text DEFAULT NULL,
  p_assigned_member_id uuid DEFAULT NULL,
  p_next_followup_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member uuid; v_role public.app_role; v_lead uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
BEGIN
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(p_clinic_id);
  IF v_role = 'profissional' THEN RAISE EXCEPTION 'Seu perfil não pode criar leads'; END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome do lead'; END IF;
  IF public.normalize_phone(p_phone) IS NULL AND public.normalize_email(p_email) IS NULL THEN
    RAISE EXCEPTION 'Informe telefone ou e-mail';
  END IF;
  IF p_assigned_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.id = p_assigned_member_id AND cm.clinic_id = p_clinic_id AND cm.is_active
  ) THEN RAISE EXCEPTION 'Responsável inválido para esta clínica'; END IF;

  INSERT INTO public.leads (clinic_id, name, phone, email, interest, source, campaign,
                            assigned_member_id, next_followup_at, created_by_member_id)
  VALUES (p_clinic_id, v_name, nullif(btrim(coalesce(p_phone, '')), ''),
          nullif(btrim(coalesce(p_email, '')), ''),
          nullif(btrim(coalesce(p_interest, '')), ''),
          nullif(btrim(coalesce(p_source, '')), ''),
          nullif(btrim(coalesce(p_campaign, '')), ''),
          p_assigned_member_id, p_next_followup_at, v_member)
  RETURNING id INTO v_lead;

  INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, new_status, created_by_member_id)
  VALUES (p_clinic_id, v_lead, 'criacao', 'Lead criado', 'novo', v_member);

  RETURN v_lead;
END;
$$;

-- editar dados do lead (não altera status/conversão)
CREATE OR REPLACE FUNCTION public.update_lead(
  p_lead_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_interest text DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_campaign text DEFAULT NULL,
  p_assigned_member_id uuid DEFAULT NULL,
  p_next_followup_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads; v_member uuid; v_role public.app_role;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(v_lead.clinic_id);
  IF v_role = 'profissional' AND v_lead.assigned_member_id IS DISTINCT FROM v_member THEN
    RAISE EXCEPTION 'Este lead não está atribuído a você';
  END IF;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome do lead'; END IF;
  IF public.normalize_phone(p_phone) IS NULL AND public.normalize_email(p_email) IS NULL THEN
    RAISE EXCEPTION 'Informe telefone ou e-mail';
  END IF;
  IF p_assigned_member_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clinic_members cm
    WHERE cm.id = p_assigned_member_id AND cm.clinic_id = v_lead.clinic_id AND cm.is_active
  ) THEN RAISE EXCEPTION 'Responsável inválido para esta clínica'; END IF;

  UPDATE public.leads SET
    name = v_name,
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    email = nullif(btrim(coalesce(p_email, '')), ''),
    interest = nullif(btrim(coalesce(p_interest, '')), ''),
    source = nullif(btrim(coalesce(p_source, '')), ''),
    campaign = nullif(btrim(coalesce(p_campaign, '')), ''),
    assigned_member_id = p_assigned_member_id,
    next_followup_at = CASE WHEN status IN ('convertido','perdido') THEN NULL ELSE p_next_followup_at END
  WHERE id = p_lead_id;

  IF p_next_followup_at IS DISTINCT FROM v_lead.next_followup_at
     AND v_lead.status NOT IN ('convertido','perdido') THEN
    INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, created_by_member_id)
    VALUES (v_lead.clinic_id, p_lead_id, 'followup',
            CASE WHEN p_next_followup_at IS NULL THEN 'Follow-up removido'
                 ELSE 'Follow-up agendado para ' || to_char(p_next_followup_at, 'DD/MM/YYYY HH24:MI') END,
            v_member);
  END IF;

  RETURN p_lead_id;
END;
$$;

-- registrar contato (+ follow-up + eventual novo estágio) — atômico
CREATE OR REPLACE FUNCTION public.register_lead_contact(
  p_lead_id uuid,
  p_kind public.lead_activity_kind,
  p_note text DEFAULT NULL,
  p_next_followup_at timestamptz DEFAULT NULL,
  p_new_status public.lead_status DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads; v_member uuid; v_role public.app_role; v_now timestamptz := now();
BEGIN
  IF p_kind NOT IN ('nota','ligacao','whatsapp','email') THEN
    RAISE EXCEPTION 'Tipo de contato inválido';
  END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(v_lead.clinic_id);
  IF v_role = 'profissional' AND v_lead.assigned_member_id IS DISTINCT FROM v_member THEN
    RAISE EXCEPTION 'Este lead não está atribuído a você';
  END IF;
  IF v_lead.status IN ('convertido','perdido') THEN
    RAISE EXCEPTION 'Este lead está encerrado. Reabra antes de registrar contato';
  END IF;
  IF p_new_status IN ('convertido','perdido') THEN
    RAISE EXCEPTION 'Use a ação específica para converter ou marcar como perdido';
  END IF;

  INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, happened_at, created_by_member_id)
  VALUES (v_lead.clinic_id, p_lead_id, p_kind, nullif(btrim(coalesce(p_note, '')), ''), v_now, v_member);

  UPDATE public.leads
     SET last_contact_at = v_now,
         next_followup_at = coalesce(p_next_followup_at, next_followup_at),
         status = CASE WHEN p_new_status IS NULL THEN status ELSE p_new_status END
   WHERE id = p_lead_id;

  IF p_next_followup_at IS NOT NULL AND p_next_followup_at IS DISTINCT FROM v_lead.next_followup_at THEN
    INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, happened_at, created_by_member_id)
    VALUES (v_lead.clinic_id, p_lead_id, 'followup',
            'Follow-up agendado para ' || to_char(p_next_followup_at, 'DD/MM/YYYY HH24:MI'), v_now, v_member);
  END IF;

  IF p_new_status IS NOT NULL AND p_new_status <> v_lead.status THEN
    INSERT INTO public.lead_activities (clinic_id, lead_id, kind, previous_status, new_status, happened_at, created_by_member_id)
    VALUES (v_lead.clinic_id, p_lead_id, 'status', v_lead.status, p_new_status, v_now, v_member);
  END IF;

  RETURN p_lead_id;
END;
$$;

-- mudança de estágio, perda e reabertura
CREATE OR REPLACE FUNCTION public.change_lead_status(
  p_lead_id uuid,
  p_new_status public.lead_status,
  p_note text DEFAULT NULL,
  p_loss_reason text DEFAULT NULL,
  p_next_followup_at timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads; v_member uuid; v_role public.app_role; v_now timestamptz := now();
  v_reason text := nullif(btrim(coalesce(p_loss_reason, '')), '');
  v_reopen boolean;
BEGIN
  IF p_new_status = 'convertido' THEN
    RAISE EXCEPTION 'Use a ação "Converter em paciente"';
  END IF;
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(v_lead.clinic_id);
  IF v_role = 'profissional' AND v_lead.assigned_member_id IS DISTINCT FROM v_member THEN
    RAISE EXCEPTION 'Este lead não está atribuído a você';
  END IF;
  IF v_lead.status = 'convertido' THEN
    RAISE EXCEPTION 'Lead já convertido em paciente';
  END IF;
  IF p_new_status = 'perdido' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo da perda';
  END IF;

  v_reopen := v_lead.status = 'perdido' AND p_new_status <> 'perdido';

  UPDATE public.leads SET
    status = p_new_status,
    loss_reason = CASE WHEN p_new_status = 'perdido' THEN v_reason ELSE NULL END,
    next_followup_at = CASE
      WHEN p_new_status = 'perdido' THEN NULL
      ELSE coalesce(p_next_followup_at, next_followup_at) END
  WHERE id = p_lead_id;

  INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, previous_status, new_status, happened_at, created_by_member_id)
  VALUES (
    v_lead.clinic_id, p_lead_id,
    CASE WHEN p_new_status = 'perdido' THEN 'perda'::public.lead_activity_kind
         WHEN v_reopen THEN 'reabertura'::public.lead_activity_kind
         ELSE 'status'::public.lead_activity_kind END,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''),
             CASE WHEN p_new_status = 'perdido' THEN 'Motivo: ' || v_reason
                  WHEN v_reopen THEN 'Lead reaberto' ELSE NULL END),
    v_lead.status, p_new_status, v_now, v_member
  );

  IF p_new_status <> 'perdido' AND p_next_followup_at IS NOT NULL
     AND p_next_followup_at IS DISTINCT FROM v_lead.next_followup_at THEN
    INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, happened_at, created_by_member_id)
    VALUES (v_lead.clinic_id, p_lead_id, 'followup',
            'Follow-up agendado para ' || to_char(p_next_followup_at, 'DD/MM/YYYY HH24:MI'), v_now, v_member);
  END IF;

  RETURN p_lead_id;
END;
$$;

-- possíveis pacientes duplicados (sempre dentro da mesma clínica)
CREATE OR REPLACE FUNCTION public.find_patient_candidates(p_lead_id uuid)
RETURNS TABLE (id uuid, name text, phone text, email text, cpf text, match_reason text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads; v_member uuid; v_role public.app_role;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE public.leads.id = p_lead_id;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(v_lead.clinic_id);
  IF v_role = 'profissional' AND v_lead.assigned_member_id IS DISTINCT FROM v_member THEN
    RAISE EXCEPTION 'Este lead não está atribuído a você';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.phone, p.email, p.cpf,
         CASE WHEN v_lead.phone_normalized IS NOT NULL
                   AND p.phone_normalized = v_lead.phone_normalized THEN 'telefone'
              ELSE 'email' END
  FROM public.patients p
  WHERE p.clinic_id = v_lead.clinic_id
    AND (
      (v_lead.phone_normalized IS NOT NULL AND p.phone_normalized = v_lead.phone_normalized)
      OR (v_lead.email_normalized IS NOT NULL AND p.email_normalized = v_lead.email_normalized)
    )
  LIMIT 10;
END;
$$;

-- conversão lead -> paciente: atômica, idempotente, segura sob concorrência
CREATE OR REPLACE FUNCTION public.convert_lead_to_patient(
  p_lead_id uuid,
  p_patient_id uuid DEFAULT NULL,
  p_force_new boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.leads; v_member uuid; v_role public.app_role;
  v_patient uuid; v_candidates jsonb; v_now timestamptz := now();
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF v_lead.id IS NULL THEN RAISE EXCEPTION 'Lead não encontrado'; END IF;
  SELECT o_member_id, o_role INTO v_member, v_role FROM public.crm_context(v_lead.clinic_id);
  IF v_role = 'profissional' AND v_lead.assigned_member_id IS DISTINCT FROM v_member THEN
    RAISE EXCEPTION 'Este lead não está atribuído a você';
  END IF;

  -- idempotência
  IF v_lead.converted_patient_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'already_converted', 'patient_id', v_lead.converted_patient_id);
  END IF;

  IF p_patient_id IS NOT NULL THEN
    SELECT p.id INTO v_patient FROM public.patients p
    WHERE p.id = p_patient_id AND p.clinic_id = v_lead.clinic_id;
    IF v_patient IS NULL THEN RAISE EXCEPTION 'Paciente não encontrado nesta clínica'; END IF;
  ELSE
    SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'phone', c.phone,
                                        'email', c.email, 'match_reason', c.match_reason))
      INTO v_candidates
    FROM public.find_patient_candidates(p_lead_id) c;

    IF v_candidates IS NOT NULL AND NOT p_force_new THEN
      RETURN jsonb_build_object('status', 'duplicates', 'candidates', v_candidates);
    END IF;
    IF v_candidates IS NOT NULL AND p_force_new AND v_role NOT IN ('admin','gestor') THEN
      RAISE EXCEPTION 'Somente admin ou gestor pode criar um paciente com possível duplicidade';
    END IF;

    INSERT INTO public.patients (clinic_id, name, phone, email, source, campaign, origin_lead_id)
    VALUES (v_lead.clinic_id, v_lead.name, v_lead.phone, v_lead.email,
            v_lead.source, v_lead.campaign, v_lead.id)
    RETURNING id INTO v_patient;
  END IF;

  UPDATE public.leads
     SET status = 'convertido', converted_patient_id = v_patient,
         next_followup_at = NULL
   WHERE id = p_lead_id;

  INSERT INTO public.lead_activities (clinic_id, lead_id, kind, note, previous_status, new_status, happened_at, created_by_member_id)
  VALUES (v_lead.clinic_id, p_lead_id, 'conversao',
          CASE WHEN p_patient_id IS NULL THEN 'Paciente criado a partir do lead'
               ELSE 'Lead vinculado a paciente existente' END,
          v_lead.status, 'convertido', v_now, v_member);

  RETURN jsonb_build_object('status', 'converted', 'patient_id', v_patient);
END;
$$;

REVOKE ALL ON FUNCTION public.create_lead(uuid, text, text, text, text, text, text, uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_lead(uuid, text, text, text, text, text, text, uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_lead_contact(uuid, public.lead_activity_kind, text, timestamptz, public.lead_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.change_lead_status(uuid, public.lead_status, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_patient_candidates(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.convert_lead_to_patient(uuid, uuid, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_lead(uuid, text, text, text, text, text, text, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_lead(uuid, text, text, text, text, text, text, uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_lead_contact(uuid, public.lead_activity_kind, text, timestamptz, public.lead_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_lead_status(uuid, public.lead_status, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_patient_candidates(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_lead_to_patient(uuid, uuid, boolean) TO authenticated;