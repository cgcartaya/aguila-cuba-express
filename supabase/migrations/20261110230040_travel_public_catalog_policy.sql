-- Anonymous catalogue reads must not invoke the authenticated membership helper.
alter policy travel_packages_read on public.travel_packages using (
 status='published'
 and exists(select 1 from public.stores s where s.id=store_id and s.slug='luxury-travel-point' and s.is_active)
);
create policy travel_packages_admin_read on public.travel_packages for select to authenticated using (
 public.has_store_role(store_id,array['OWNER','ADMIN'])
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
 and exists(select 1 from public.stores s where s.id=store_id and s.slug='luxury-travel-point' and s.is_active)
);
