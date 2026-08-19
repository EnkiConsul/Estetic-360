-- =========================================================
-- Estetic360º — Fase 1: fundação, acesso e multiempresa
-- =========================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'recepcao', 'profissional', 'financeiro');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------
-- clinics
-- ---------------------------------------------------------
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  document text,
  phone text,
  email text,
  city text,
  state text CHECK (state IS NULL OR length(state) = 2),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------
-- profiles (user <-> clinic)
-- ---------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_clinic_id_idx ON public.profiles (clinic_id);

-- ---------------------------------------------------------
-- user_roles
-- ---------------------------------------------------------
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, clinic_id, role)
);
CREATE INDEX user_roles_clinic_id_idx ON public.user_roles (clinic_id);

-- ---------------------------------------------------------
-- Helper functions (security definer, fail closed)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.clinic_id
  FROM public.profiles p
  WHERE p.id = auth.uid() AND p.is_active
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.clinic_id = public.current_clinic_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_clinic_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor')
$$;

-- ---------------------------------------------------------
-- procedures
-- ---------------------------------------------------------
CREATE TABLE public.procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  category text,
  default_price numeric(12, 2) CHECK (default_price IS NULL OR default_price >= 0),
  default_sessions integer NOT NULL DEFAULT 1 CHECK (default_sessions BETWEEN 1 AND 100),
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 5 AND 600),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX procedures_clinic_id_idx ON public.procedures (clinic_id);
CREATE UNIQUE INDEX procedures_clinic_name_key ON public.procedures (clinic_id, lower(btrim(name)));

-- ---------------------------------------------------------
-- patients (base mínima)
-- ---------------------------------------------------------
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  phone text,
  email text,
  cpf text,
  birth_date date,
  source text,
  campaign text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX patients_clinic_id_idx ON public.patients (clinic_id);
CREATE UNIQUE INDEX patients_clinic_cpf_key ON public.patients (clinic_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX patients_clinic_phone_idx ON public.patients (clinic_id, phone);

-- ---------------------------------------------------------
-- leads (base mínima)
-- ---------------------------------------------------------
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  phone text,
  email text,
  interest text,
  source text,
  campaign text,
  owner_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  next_followup_at timestamptz,
  status text NOT NULL DEFAULT 'novo' CHECK (
    status IN (
      'novo', 'em_contato', 'interessado', 'avaliacao_agendada',
      'avaliacao_realizada', 'proposta', 'convertido', 'perdido'
    )
  ),
  loss_reason text,
  converted_patient_id uuid REFERENCES public.patients (id) ON DELETE SET NULL,
  last_contact_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX leads_clinic_status_idx ON public.leads (clinic_id, status);
CREATE INDEX leads_clinic_followup_idx ON public.leads (clinic_id, next_followup_at);

-- ---------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------
CREATE TRIGGER clinics_set_updated_at BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER procedures_set_updated_at BEFORE UPDATE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER patients_set_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER leads_set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.clinics TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.procedures TO service_role;
GRANT ALL ON public.patients TO service_role;
GRANT ALL ON public.leads TO service_role;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- clinics: só a própria clínica
CREATE POLICY "clinics_select_own" ON public.clinics
  FOR SELECT TO authenticated USING (id = public.current_clinic_id());
CREATE POLICY "clinics_update_manager" ON public.clinics
  FOR UPDATE TO authenticated
  USING (id = public.current_clinic_id() AND public.is_clinic_manager())
  WITH CHECK (id = public.current_clinic_id() AND public.is_clinic_manager());

-- profiles
CREATE POLICY "profiles_select_same_clinic" ON public.profiles
  FOR SELECT TO authenticated USING (clinic_id = public.current_clinic_id());
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND (id = auth.uid() OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (clinic_id = public.current_clinic_id() AND (id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- user_roles
CREATE POLICY "user_roles_select_same_clinic" ON public.user_roles
  FOR SELECT TO authenticated USING (clinic_id = public.current_clinic_id());
CREATE POLICY "user_roles_insert_admin" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_delete_admin" ON public.user_roles
  FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.has_role(auth.uid(), 'admin'));

-- procedures
CREATE POLICY "procedures_select_same_clinic" ON public.procedures
  FOR SELECT TO authenticated USING (clinic_id = public.current_clinic_id());
CREATE POLICY "procedures_insert_manager" ON public.procedures
  FOR INSERT TO authenticated
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.is_clinic_manager());
CREATE POLICY "procedures_update_manager" ON public.procedures
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.is_clinic_manager())
  WITH CHECK (clinic_id = public.current_clinic_id() AND public.is_clinic_manager());
CREATE POLICY "procedures_delete_manager" ON public.procedures
  FOR DELETE TO authenticated
  USING (clinic_id = public.current_clinic_id() AND public.is_clinic_manager());

-- patients
CREATE POLICY "patients_select_same_clinic" ON public.patients
  FOR SELECT TO authenticated USING (clinic_id = public.current_clinic_id());
CREATE POLICY "patients_insert_same_clinic" ON public.patients
  FOR INSERT TO authenticated WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "patients_update_same_clinic" ON public.patients
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- leads
CREATE POLICY "leads_select_same_clinic" ON public.leads
  FOR SELECT TO authenticated USING (clinic_id = public.current_clinic_id());
CREATE POLICY "leads_insert_same_clinic" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (clinic_id = public.current_clinic_id());
CREATE POLICY "leads_update_same_clinic" ON public.leads
  FOR UPDATE TO authenticated
  USING (clinic_id = public.current_clinic_id())
  WITH CHECK (clinic_id = public.current_clinic_id());

-- ---------------------------------------------------------
-- Bootstrap: cria clínica + perfil + papel admin + demonstração
-- Atômico e idempotente
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_clinic(p_clinic_name text, p_full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_email text;
  v_clinic uuid;
  v_name text := nullif(btrim(coalesce(p_clinic_name, '')), '');
  v_person text := nullif(btrim(coalesce(p_full_name, '')), '');
  v_proc_botox uuid;
  v_proc_preenchimento uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT clinic_id INTO v_clinic FROM public.profiles WHERE id = v_user;
  IF v_clinic IS NOT NULL THEN
    RETURN v_clinic;
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da clínica';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user;

  INSERT INTO public.clinics (name, email, created_by)
  VALUES (v_name, v_email, v_user)
  RETURNING id INTO v_clinic;

  INSERT INTO public.profiles (id, clinic_id, full_name, email)
  VALUES (v_user, v_clinic, coalesce(v_person, split_part(coalesce(v_email, ''), '@', 1)), v_email);

  INSERT INTO public.user_roles (user_id, clinic_id, role)
  VALUES (v_user, v_clinic, 'admin')
  ON CONFLICT (user_id, clinic_id, role) DO NOTHING;

  -- Procedimentos de demonstração (editáveis/removíveis pela clínica)
  INSERT INTO public.procedures (clinic_id, name, category, default_price, default_sessions, duration_minutes)
  VALUES
    (v_clinic, 'Toxina Botulínica', 'Harmonização facial', 1200.00, 1, 60),
    (v_clinic, 'Preenchimento Labial', 'Harmonização facial', 1500.00, 1, 60),
    (v_clinic, 'Limpeza de Pele Profunda', 'Estética facial', 250.00, 4, 90),
    (v_clinic, 'Peeling Químico', 'Estética facial', 350.00, 3, 60),
    (v_clinic, 'Drenagem Linfática', 'Estética corporal', 180.00, 10, 60),
    (v_clinic, 'Criolipólise', 'Estética corporal', 900.00, 2, 120)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_proc_botox FROM public.procedures
    WHERE clinic_id = v_clinic AND lower(btrim(name)) = 'toxina botulínica';
  SELECT id INTO v_proc_preenchimento FROM public.procedures
    WHERE clinic_id = v_clinic AND lower(btrim(name)) = 'preenchimento labial';

  -- Pacientes de demonstração
  INSERT INTO public.patients (clinic_id, name, phone, email, birth_date, source, campaign)
  VALUES
    (v_clinic, 'Ana Beatriz Souza', '(11) 98888-1010', 'ana.souza@exemplo.com', '1990-04-12', 'Indicação', 'Indicação de paciente'),
    (v_clinic, 'Carla Menezes', '(11) 97777-2020', 'carla.menezes@exemplo.com', '1985-09-30', 'Instagram', 'Harmonização Outono'),
    (v_clinic, 'Juliana Prado', '(21) 96666-3030', 'juliana.prado@exemplo.com', '1997-01-22', 'Google', 'Pesquisa local');

  -- Leads de demonstração
  INSERT INTO public.leads (clinic_id, name, phone, email, interest, source, campaign, owner_id, status, next_followup_at, last_contact_at)
  VALUES
    (v_clinic, 'Mariana Lopes', '(11) 95555-4040', 'mariana.lopes@exemplo.com', 'Toxina Botulínica', 'Instagram', 'Harmonização Outono', v_user, 'novo', now() + interval '1 day', NULL),
    (v_clinic, 'Patrícia Nunes', '(11) 94444-5050', 'patricia.nunes@exemplo.com', 'Preenchimento Labial', 'WhatsApp', 'Orgânico', v_user, 'em_contato', now() - interval '2 day', now() - interval '5 day'),
    (v_clinic, 'Renata Alves', '(31) 93333-6060', NULL, 'Criolipólise', 'Indicação', 'Indicação de paciente', v_user, 'avaliacao_agendada', now() + interval '3 day', now() - interval '1 day'),
    (v_clinic, 'Fernanda Dias', '(11) 92222-7070', 'fernanda.dias@exemplo.com', 'Limpeza de Pele Profunda', 'Facebook', 'Pele Saudável', v_user, 'proposta', now() - interval '1 day', now() - interval '3 day');

  RETURN v_clinic;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_clinic(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.bootstrap_clinic(text, text) TO authenticated;
