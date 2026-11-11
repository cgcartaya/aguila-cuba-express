alter table public.shipments
  add column customs_charges jsonb not null default '[]'::jsonb,
  add constraint shipments_customs_charges_valid check (
    case when jsonb_typeof(customs_charges) = 'array' then
      jsonb_array_length(customs_charges) <= 100
      and not jsonb_path_exists(customs_charges,
        '$[*] ? (@.type() != "object" || !(exists(@.description)) || @.description.type() != "string" || @.description == "" || !(exists(@.amount)) || @.amount.type() != "number" || @.amount <= 0)')
    else false end
  );
