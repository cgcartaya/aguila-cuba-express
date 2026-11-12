-- Editorial inventory. All access currently goes through trusted server code.
create table public.dmc_destinations (
  store_id uuid not null references public.stores(id) on delete cascade,
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  name text not null check (length(trim(name)) > 0),
  slug text not null check (slug ~ '^[a-z]+(-[a-z]+)*$'),
  editorial_status text not null default 'draft'
    check (editorial_status in ('draft', 'in_review', 'published', 'archived')),
  draft_content jsonb not null default '{}' check (jsonb_typeof(draft_content) = 'object'),
  published_content jsonb check (jsonb_typeof(published_content) = 'object'),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (store_id, state_code),
  unique (store_id, slug),
  check (
    (published_content is null and published_at is null)
    or (published_content is not null and published_at is not null)
  ),
  check (editorial_status <> 'published' or published_at is not null),
  check (editorial_status <> 'archived' or published_at is null)
);

alter table public.dmc_destinations enable row level security;
revoke all on public.dmc_destinations from public, anon, authenticated;
grant select, insert, update, delete on public.dmc_destinations to service_role;

insert into public.dmc_destinations (store_id, state_code, name, slug)
select store.id, states.code, states.name, replace(lower(states.name), ' ', '-')
from public.stores as store
cross join (values
  ('AL', 'Alabama'), ('AK', 'Alaska'), ('AZ', 'Arizona'), ('AR', 'Arkansas'),
  ('CA', 'California'), ('CO', 'Colorado'), ('CT', 'Connecticut'), ('DE', 'Delaware'),
  ('FL', 'Florida'), ('GA', 'Georgia'), ('HI', 'Hawaii'), ('ID', 'Idaho'),
  ('IL', 'Illinois'), ('IN', 'Indiana'), ('IA', 'Iowa'), ('KS', 'Kansas'),
  ('KY', 'Kentucky'), ('LA', 'Louisiana'), ('ME', 'Maine'), ('MD', 'Maryland'),
  ('MA', 'Massachusetts'), ('MI', 'Michigan'), ('MN', 'Minnesota'), ('MS', 'Mississippi'),
  ('MO', 'Missouri'), ('MT', 'Montana'), ('NE', 'Nebraska'), ('NV', 'Nevada'),
  ('NH', 'New Hampshire'), ('NJ', 'New Jersey'), ('NM', 'New Mexico'), ('NY', 'New York'),
  ('NC', 'North Carolina'), ('ND', 'North Dakota'), ('OH', 'Ohio'), ('OK', 'Oklahoma'),
  ('OR', 'Oregon'), ('PA', 'Pennsylvania'), ('RI', 'Rhode Island'), ('SC', 'South Carolina'),
  ('SD', 'South Dakota'), ('TN', 'Tennessee'), ('TX', 'Texas'), ('UT', 'Utah'),
  ('VT', 'Vermont'), ('VA', 'Virginia'), ('WA', 'Washington'), ('WV', 'West Virginia'),
  ('WI', 'Wisconsin'), ('WY', 'Wyoming')
) as states(code, name)
where store.slug = 'luxury-travel-point'
on conflict (store_id, state_code) do nothing;
