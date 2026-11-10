-- Storage must also be able to return the newly uploaded object's metadata.
create policy travel_assets_admin_read on storage.objects for select to authenticated using (
 bucket_id='travel-assets'
 and public.has_store_role((storage.foldername(storage.objects.name))[1]::uuid,array['OWNER','ADMIN'])
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
 and exists(
  select 1 from public.stores s
  where s.id::text=(storage.foldername(storage.objects.name))[1]
    and s.slug='luxury-travel-point' and s.is_active
 )
);
