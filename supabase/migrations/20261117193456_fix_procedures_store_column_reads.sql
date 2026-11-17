-- stores uses column-level grants. New columns are not automatically readable.
-- Shared storefront, metadata and membership projections include these flags.
grant select (module_procedures_enabled, procedures_public_enabled)
  on public.stores to anon, authenticated;

-- Existing RLS and procedure_module_flags continue to restrict flag updates
-- to an active superadministrator. No procedure data is granted to clients.
grant update (module_procedures_enabled, procedures_public_enabled)
  on public.stores to authenticated;
