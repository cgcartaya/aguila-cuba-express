-- DeParis · Fase 2.1 · Contenido bilingüe del menú
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.menu_items
  add column if not exists name_en text,
  add column if not exists description_en text;

comment on column public.menu_items.name_en is
  'English public name. Falls back to name when empty.';
comment on column public.menu_items.description_en is
  'English public description. Falls back to description when empty.';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_items'
  and column_name in ('name_en', 'description_en')
order by column_name;
