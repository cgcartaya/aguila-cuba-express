-- =========================================================
-- FASE 4 - ROLES REALES SaaS MULTITIENDA
-- Modelo:
-- 1) super_admin: ve /admin/saas, todas las tiendas y puede administrar cualquiera.
-- 2) store_owner: entra directo a su tienda, sin selector de tiendas.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1) Perfil general del usuario
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'store_owner' check (role in ('super_admin', 'store_owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_active_idx on public.profiles(active);

-- =========================================================
-- 2) Relación usuario -> tienda
--    Para clientes normales usaremos una sola tienda activa.
--    El super_admin no necesita registro aquí para ver todas.
-- =========================================================
create table if not exists public.store_users (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create index if not exists store_users_store_id_idx on public.store_users(store_id);
create index if not exists store_users_user_id_idx on public.store_users(user_id);
create index if not exists store_users_active_idx on public.store_users(active);

-- =========================================================
-- 3) Helpers seguros para RLS
-- =========================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and p.active = true
  );
$$;

create or replace function public.user_has_store_access(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.store_users su
      join public.profiles p on p.id = su.user_id
      where su.user_id = auth.uid()
        and su.store_id = target_store_id
        and su.active = true
        and p.active = true
    );
$$;

-- =========================================================
-- 4) RLS base para las nuevas tablas
-- =========================================================
alter table public.profiles enable row level security;
alter table public.store_users enable row level security;

-- Recrear políticas sin duplicados
DROP POLICY IF EXISTS "profiles_select_own_or_super" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_super_only" ON public.profiles;
DROP POLICY IF EXISTS "store_users_select_own_or_super" ON public.store_users;
DROP POLICY IF EXISTS "store_users_write_super_only" ON public.store_users;

create policy "profiles_select_own_or_super"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_super_admin());

create policy "profiles_update_super_only"
on public.profiles
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "store_users_select_own_or_super"
on public.store_users
for select
to authenticated
using (user_id = auth.uid() or public.is_super_admin());

create policy "store_users_write_super_only"
on public.store_users
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- =========================================================
-- 5) Políticas recomendadas para stores
--    Ejecuta esto si ya tienes RLS activo o quieres activarlo en stores.
-- =========================================================
alter table public.stores enable row level security;

DROP POLICY IF EXISTS "stores_select_by_access" ON public.stores;
DROP POLICY IF EXISTS "stores_write_super_only" ON public.stores;

create policy "stores_select_by_access"
on public.stores
for select
to authenticated
using (public.user_has_store_access(id));

create policy "stores_write_super_only"
on public.stores
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

-- =========================================================
-- 6) IMPORTANTE: convertir tu usuario actual en super_admin
-- Cambia el email por el tuyo real y ejecútalo DESPUÉS de crear/login con tu usuario.
-- =========================================================
-- insert into public.profiles (id, email, full_name, role, active)
-- select id, email, 'Carlos', 'super_admin', true
-- from auth.users
-- where lower(email) = lower('TU_CORREO@email.com')
-- on conflict (id) do update set
--   email = excluded.email,
--   full_name = excluded.full_name,
--   role = 'super_admin',
--   active = true,
--   updated_at = now();
