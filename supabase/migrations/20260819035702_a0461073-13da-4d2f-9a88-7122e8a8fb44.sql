CREATE POLICY "clinic_files_select_own_clinic" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic_files_insert_own_clinic" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-files'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic_files_update_own_clinic" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  )
  WITH CHECK (
    bucket_id = 'clinic-files'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );

CREATE POLICY "clinic_files_delete_own_clinic" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinic-files'
    AND (storage.foldername(name))[1] = public.current_clinic_id()::text
  );