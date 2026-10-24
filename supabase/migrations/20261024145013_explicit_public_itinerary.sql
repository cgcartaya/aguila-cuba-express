-- Distinguish an intentionally empty announcement from an old customer-based route.
alter table public.pickup_routes add column public_itinerary_managed boolean not null default false;
update public.pickup_routes set public_itinerary_managed = true where jsonb_array_length(public_itinerary) > 0;
