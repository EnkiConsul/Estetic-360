REVOKE ALL ON FUNCTION public.set_updated_at() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_clinic_id() FROM public, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_clinic_manager() FROM public, anon;
REVOKE ALL ON FUNCTION public.bootstrap_clinic(text, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.current_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_clinic(text, text) TO authenticated;