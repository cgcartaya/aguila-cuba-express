alter table public.pickup_routes
  add column if not exists public_checkpoint jsonb;
