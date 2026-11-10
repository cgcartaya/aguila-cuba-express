-- Qualify the object path so the stores subquery cannot bind it to stores.name.
alter policy travel_assets_insert on storage.objects with check (
 bucket_id='travel-assets'
 and public.has_store_role((storage.foldername(storage.objects.name))[1]::uuid,array['OWNER','ADMIN'])
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
 and exists(
  select 1 from public.stores s
  where s.id::text=(storage.foldername(storage.objects.name))[1]
    and s.slug='luxury-travel-point' and s.is_active
 )
);
