-- =========================================================
-- FASE 0 — Correção da fundação multiempresa
-- Banco verificado vazio (0 usuários / 0 registros): sem migração de dados.
-- =========================================================

-- 1) Remover estruturas antecipadas da Fase 1 (todas vazias)
DROP FUNCTION IF EXISTS public.convert_lead_to_patient(uuid);
DROP TABLE IF EXISTS public.lead_activities CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.procedures CASCADE;

-- 2) Remover autorização antiga (será substituída por clinic_members)
DROP POLICY IF EXISTS clinics_select_own ON public.clinics;
DROP POLICY IF EXISTS clinics_update_manager ON public.clinics;
DROP FUNCTION IF EXISTS public.bootstrap_clinic(text, text);
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP FUNCTION IF EXISTS public.is_clinic_manager() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- 3) profiles = perfil global
DROP POLICY IF EXISTS profiles_select_same_clinic ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS clinic_id;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

-- 4) clinic_members
CREATE TABLE public.clinic_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, user_id)
);
CREATE INDEX clinic_members_user_idx ON public.clinic_members (user_id) WHERE is_active;
CREATE INDEX clinic_members_clinic_idx ON public.clinic_members (clinic_id) WHERE is_active;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_members TO authenticated;
GRANT ALL ON public.clinic_members TO service_role;
ALTER TABLE public.clinic_members ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER clinic_members_set_updated_at
  BEFORE UPDATE ON public.clinic_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Helpers de autorização (SECURITY DEFINER para evitar recursão de RLS
--    ao consultar clinic_members dentro das próprias policies).
DROP FUNCTION IF EXISTS public.current_clinic_id() CASCADE;

CREATE OR REPLACE FUNCTION public.is_clinic_member(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.clinic_id = p_clinic_id
      AND cm.user_id = auth.uid()
      AND cm.is_active
  )
$$;

CREATE OR REPLACE FUNCTION public.has_clinic_role(p_clinic_id uuid, p_role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members cm
    WHERE cm.clinic_id = p_clinic_id
      AND cm.user_id = auth.uid()
      AND cm.is_active
      AND cm.role = p_role
  )
$$;

CREATE OR REPLACE FUNCTION public.shares_clinic_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clinic_members mine
    JOIN public.clinic_members theirs ON theirs.clinic_id = mine.clinic_id
    WHERE mine.user_id = auth.uid() AND mine.is_active
      AND theirs.user_id = p_user_id AND theirs.is_active
  )
$$;

REVOKE ALL ON FUNCTION public.is_clinic_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_clinic_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_clinic_with(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_clinic_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_clinic_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_clinic_with(uuid) TO authenticated;

-- 6) RLS baseada em membership
-- profiles
CREATE POLICY profiles_select_self_or_shared_clinic ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_clinic_with(id));

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (active_clinic_id IS NULL OR public.is_clinic_member(active_clinic_id))
  );

-- clinics
CREATE POLICY clinics_select_member ON public.clinics
  FOR SELECT TO authenticated
  USING (public.is_clinic_member(id));

CREATE POLICY clinics_update_manager ON public.clinics
  FOR UPDATE TO authenticated
  USING (public.has_clinic_role(id, 'admin') OR public.has_clinic_role(id, 'gestor'))
  WITH CHECK (public.has_clinic_role(id, 'admin') OR public.has_clinic_role(id, 'gestor'));

-- clinic_members
CREATE POLICY clinic_members_select_member ON public.clinic_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_clinic_member(clinic_id));

CREATE POLICY clinic_members_insert_admin ON public.clinic_members
  FOR INSERT TO authenticated
  WITH CHECK (public.has_clinic_role(clinic_id, 'admin'));

CREATE POLICY clinic_members_update_admin ON public.clinic_members
  FOR UPDATE TO authenticated
  USING (public.has_clinic_role(clinic_id, 'admin'))
  WITH CHECK (public.has_clinic_role(clinic_id, 'admin'));

CREATE POLICY clinic_members_delete_admin ON public.clinic_members
  FOR DELETE TO authenticated
  USING (public.has_clinic_role(clinic_id, 'admin'));

-- 7) Onboarding atômico, sem dados fictícios
CREATE OR REPLACE FUNCTION public.create_clinic_with_admin(p_clinic_name text, p_full_name text)
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
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Idempotência: se já existe vínculo ativo, devolve a clínica existente.
  SELECT cm.clinic_id INTO v_clinic
  FROM public.clinic_members cm
  WHERE cm.user_id = v_user AND cm.is_active
  ORDER BY cm.created_at
  LIMIT 1;

  IF v_clinic IS NOT NULL THEN
    RETURN v_clinic;
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da clínica';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user;

  INSERT INTO public.clinics (name, email, created_by)
  VALUES (v_name, v_email, v_user)
  RETURNING id INTO v_clinic;

  INSERT INTO public.profiles (id, full_name, email, active_clinic_id)
  VALUES (v_user, coalesce(v_person, split_part(coalesce(v_email, ''), '@', 1)), v_email, v_clinic)
  ON CONFLICT (id) DO UPDATE
    SET active_clinic_id = excluded.active_clinic_id,
        full_name = coalesce(nullif(btrim(public.profiles.full_name), ''), excluded.full_name);

  INSERT INTO public.clinic_members (clinic_id, user_id, role)
  VALUES (v_clinic, v_user, 'admin')
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  RETURN v_clinic;
END;
$$;

REVOKE ALL ON FUNCTION public.create_clinic_with_admin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_clinic_with_admin(text, text) TO authenticated;

-- 8) Storage: acesso por membership, pasta = clinic_id
DROP POLICY IF EXISTS clinic_files_select_own_clinic ON storage.objects;
DROP POLICY IF EXISTS clinic_files_insert_own_clinic ON storage.objects;
DROP POLICY IF EXISTS clinic_files_update_own_clinic ON storage.objects;
DROP POLICY IF EXISTS clinic_files_delete_own_clinic ON storage.objects;

CREATE POLICY clinic_files_select_member ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND public.is_clinic_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

CREATE POLICY clinic_files_insert_member ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-files'
    AND public.is_clinic_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

CREATE POLICY clinic_files_update_member ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND public.is_clinic_member(nullif((storage.foldername(name))[1], '')::uuid)
  )
  WITH CHECK (
    bucket_id = 'clinic-files'
    AND public.is_clinic_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

CREATE POLICY clinic_files_delete_member ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND public.is_clinic_member(nullif((storage.foldername(name))[1], '')::uuid)
  );
