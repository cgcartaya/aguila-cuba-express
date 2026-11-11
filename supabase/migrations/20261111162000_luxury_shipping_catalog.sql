create table public.luxury_shipping_catalog (
  store_id uuid not null references public.stores(id) on delete cascade,
  key text not null,
  section text not null check (section in ('hero','rate','special','promotion','online')),
  service_key text,
  position integer not null default 0,
  enabled boolean not null default false,
  visible boolean not null default true,
  starts_on date,
  ends_on date,
  weekdays smallint[] not null default '{}',
  external_url text not null default '',
  copy jsonb not null,
  primary key (store_id,key),
  foreign key (store_id,service_key) references public.luxury_shipping_catalog(store_id,key),
  check (section <> 'promotion' or (starts_on is not null and ends_on is not null and ends_on >= starts_on)),
  check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[] and array_position(weekdays,null) is null),
  check (external_url = '' or external_url ~ '^https://[^[:space:]]+$'),
  check (jsonb_typeof(copy) = 'object' and copy ?& array['es','en','fr'])
);

alter table public.luxury_shipping_catalog enable row level security;
revoke all on public.luxury_shipping_catalog from public, anon, authenticated;
grant select on public.luxury_shipping_catalog to anon, authenticated;
grant insert on public.luxury_shipping_catalog to authenticated;
grant update (copy,service_key,position,enabled,visible,starts_on,ends_on,weekdays,external_url)
  on public.luxury_shipping_catalog to authenticated;

create policy luxury_shipping_public_read on public.luxury_shipping_catalog for select to anon, authenticated
using (
  enabled and visible
  and exists (select 1 from public.stores s where s.id=store_id and s.slug='luxury-travel-point' and s.is_active)
  and (section <> 'promotion' or (
    (now() at time zone 'America/New_York')::date between starts_on and ends_on
    and (cardinality(weekdays)=0 or extract(dow from now() at time zone 'America/New_York')::smallint=any(weekdays))
  ))
);

create policy luxury_shipping_admin_access on public.luxury_shipping_catalog for all to authenticated
using (
  public.has_store_role(store_id,array['OWNER','ADMIN'])
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
  and exists (select 1 from public.stores s where s.id=store_id and s.slug='luxury-travel-point' and s.is_active)
) with check (
  public.has_store_role(store_id,array['OWNER','ADMIN'])
  and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.active)
  and exists (select 1 from public.stores s where s.id=store_id and s.slug='luxury-travel-point' and s.is_active)
);

insert into public.luxury_shipping_catalog (store_id,key,section,service_key,position,enabled,visible,starts_on,ends_on,weekdays,external_url,copy)
select s.id,x.key,x.section,x.service_key,x.position,x.enabled,x.visible,x.starts_on,x.ends_on,x.weekdays,x.external_url,x.copy
from public.stores s cross join jsonb_to_recordset($seed$
[
  {
    "key": "gold",
    "section": "hero",
    "service_key": null,
    "position": 0,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Caja dorada 15 × 15 × 15",
        "price": "Desde $0.70 por libra",
        "description": "Caja, envoltura y entrega a domicilio GRATIS. Todo incluido, sin cargos extras.",
        "terms": "Consulta las condiciones según el contenido. Otras medidas: 12 × 12 × 12 y 22 × 22 × 22.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "15 × 15 × 15 gold box",
        "price": "From $0.70 per pound",
        "description": "FREE box, wrapping and home delivery. All included with no extra charges.",
        "terms": "Ask about conditions for your items. Other sizes: 12 × 12 × 12 and 22 × 22 × 22.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Boîte dorée 15 × 15 × 15",
        "price": "À partir de 0,70 $ la livre",
        "description": "Boîte, emballage et livraison à domicile GRATUITS. Tout est inclus, sans frais supplémentaires.",
        "terms": "Renseignez-vous selon le contenu. Autres dimensions : 12 × 12 × 12 et 22 × 22 × 22.",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "sea",
    "section": "rate",
    "service_key": null,
    "position": 10,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Marítimo",
        "price": "$1.99/lb",
        "description": "",
        "terms": "",
        "delivery": "25–35 días hábiles desde la salida del barco.",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Ocean shipping",
        "price": "$1.99/lb",
        "description": "",
        "terms": "",
        "delivery": "25–35 business days from vessel departure.",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Envoi maritime",
        "price": "1,99 $/lb",
        "description": "",
        "terms": "",
        "delivery": "25 à 35 jours ouvrables après le départ du navire.",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "air",
    "section": "rate",
    "service_key": null,
    "position": 20,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Aéreo",
        "price": "$3.99/lb",
        "description": "",
        "terms": "",
        "delivery": "7–15 días hábiles desde la salida del avión.",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Air shipping",
        "price": "$3.99/lb",
        "description": "",
        "terms": "",
        "delivery": "7–15 business days from flight departure.",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Envoi aérien",
        "price": "3,99 $/lb",
        "description": "",
        "terms": "",
        "delivery": "7 à 15 jours ouvrables après le départ du vol.",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "express",
    "section": "special",
    "service_key": null,
    "position": 30,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Envíos Express",
        "price": "Desde $4.99/lb",
        "description": "De Estados Unidos a Cuba.",
        "terms": "Consulte salidas disponibles, precios y tiempos antes de enviar. Los plazos dependen de la salida, destino y confirmación de la agencia.",
        "delivery": "De Pinar del Río a Cienfuegos: 24–72 horas. Resto de Cuba: hasta 7 días.",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Express shipping",
        "price": "From $4.99/lb",
        "description": "From the United States to Cuba.",
        "terms": "Check departures, prices and delivery times before shipping. Estimates depend on departure, destination and agency confirmation.",
        "delivery": "Pinar del Río to Cienfuegos: 24–72 hours. Rest of Cuba: up to 7 days.",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Envoi express",
        "price": "À partir de 4,99 $/lb",
        "description": "Des États-Unis vers Cuba.",
        "terms": "Vérifiez les départs, tarifs et délais avant tout envoi. Les délais dépendent du départ, de la destination et de la confirmation de l’agence.",
        "delivery": "De Pinar del Río à Cienfuegos : 24 à 72 heures. Reste de Cuba : jusqu’à 7 jours.",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "durables",
    "section": "special",
    "service_key": null,
    "position": 40,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Duraderos y electrodomésticos",
        "price": "$1.49/lb + $20 por caja",
        "description": "",
        "terms": "Pueden estar sujetos a aranceles aduanales adicionales.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Durable goods and appliances",
        "price": "$1.49/lb + $20 per box",
        "description": "",
        "terms": "Additional customs duties may apply.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Biens durables et électroménager",
        "price": "1,49 $/lb + 20 $ par boîte",
        "description": "",
        "terms": "Des droits de douane supplémentaires peuvent s’appliquer.",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "vehicles",
    "section": "special",
    "service_key": null,
    "position": 50,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Envío de vehículos a Cuba",
        "price": "",
        "description": "La agencia confirma los detalles de este servicio especializado.",
        "terms": "",
        "delivery": "",
        "button": "Consultar envío de vehículo",
        "message": ""
      },
      "en": {
        "title": "Vehicle shipping to Cuba",
        "price": "",
        "description": "The agency will confirm details for this specialized service.",
        "terms": "",
        "delivery": "",
        "button": "Ask about vehicle shipping",
        "message": ""
      },
      "fr": {
        "title": "Transport de véhicules vers Cuba",
        "price": "",
        "description": "L’agence vous confirmera les modalités de ce service spécialisé.",
        "terms": "",
        "delivery": "",
        "button": "Se renseigner sur le transport de véhicules",
        "message": ""
      }
    }
  },
  {
    "key": "seniors",
    "section": "promotion",
    "service_key": null,
    "position": 60,
    "enabled": true,
    "visible": true,
    "starts_on": "2026-11-01",
    "ends_on": "2026-11-30",
    "weekdays": [
      3
    ],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Mayores de 55 años",
        "price": "$0.99/lb + $20 por caja",
        "description": "Miércoles de noviembre.",
        "terms": "Hasta 70 lb por bulto. Se pueden enviar varios bultos de misceláneas, aseo, comida y medicinas. La agencia confirma la elegibilidad.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Customers over 55",
        "price": "$0.99/lb + $20 per box",
        "description": "Wednesdays in November.",
        "terms": "Up to 70 lb per parcel. Multiple parcels of miscellaneous items, toiletries, food and medicines are allowed. The agency confirms eligibility.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Clients de plus de 55 ans",
        "price": "0,99 $/lb + 20 $ par boîte",
        "description": "Les mercredis de novembre.",
        "terms": "Jusqu’à 70 lb par colis. Plusieurs colis d’articles divers, de produits d’hygiène, d’aliments et de médicaments sont autorisés. L’agence confirme l’admissibilité.",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "new",
    "section": "promotion",
    "service_key": null,
    "position": 70,
    "enabled": true,
    "visible": true,
    "starts_on": "2026-11-01",
    "ends_on": "2026-11-30",
    "weekdays": [
      6
    ],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Clientes nuevos",
        "price": "$0.99/lb + $20 por caja",
        "description": "Sábados de noviembre.",
        "terms": "Hasta 70 lb por bulto. Se pueden enviar varios bultos de misceláneas, aseo, comida y medicinas. La agencia confirma la elegibilidad.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "New customers",
        "price": "$0.99/lb + $20 per box",
        "description": "Saturdays in November.",
        "terms": "Up to 70 lb per parcel. Multiple parcels of miscellaneous items, toiletries, food and medicines are allowed. The agency confirms eligibility.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Nouveaux clients",
        "price": "0,99 $/lb + 20 $ par boîte",
        "description": "Les samedis de novembre.",
        "terms": "Jusqu’à 70 lb par colis. Plusieurs colis d’articles divers, de produits d’hygiène, d’aliments et de médicaments sont autorisés. L’agence confirme l’admissibilité.",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "office",
    "section": "promotion",
    "service_key": null,
    "position": 80,
    "enabled": true,
    "visible": true,
    "starts_on": "2026-11-01",
    "ends_on": "2026-11-30",
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Clientes de la oficina",
        "price": "$0.99/lb + $20 por caja",
        "description": "Todo noviembre para quienes ya utilizaron algún servicio de la oficina.",
        "terms": "Hasta 70 lb por bulto. Se pueden enviar varios bultos de misceláneas, aseo, comida y medicinas. La agencia confirma la elegibilidad.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Office customers",
        "price": "$0.99/lb + $20 per box",
        "description": "All November for customers who have used any office service.",
        "terms": "Up to 70 lb per parcel. Multiple parcels of miscellaneous items, toiletries, food and medicines are allowed. The agency confirms eligibility.",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Clients de l’agence",
        "price": "0,99 $/lb + 20 $ par boîte",
        "description": "Tout le mois de novembre pour les clients ayant déjà utilisé un service de l’agence.",
        "terms": "Jusqu’à 70 lb par colis. Plusieurs colis d’articles divers, de produits d’hygiène, d’aliments et de médicaments sont autorisés. L’agence confirme l’admissibilité.",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "air-volume",
    "section": "promotion",
    "service_key": "air",
    "position": 90,
    "enabled": true,
    "visible": true,
    "starts_on": "2026-11-01",
    "ends_on": "2026-11-30",
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Envíe más, pague menos",
        "price": "$2.99/lb",
        "description": "Envío aéreo de más de 50 lb en una misma caja.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Ship more, pay less",
        "price": "$2.99/lb",
        "description": "Air shipments over 50 lb in a single box.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Expédiez plus, payez moins",
        "price": "2,99 $/lb",
        "description": "Envoi aérien de plus de 50 lb dans une même boîte.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "loyalty",
    "section": "promotion",
    "service_key": "gold",
    "position": 100,
    "enabled": true,
    "visible": true,
    "starts_on": "2026-11-01",
    "ends_on": "2026-11-30",
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Beneficio para clientes frecuentes",
        "price": "",
        "description": "Beneficio especial de noviembre. Consulta las condiciones con nuestra oficina.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Benefit for returning customers",
        "price": "",
        "description": "Special November benefit. Ask our office about the terms.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Avantage pour les clients fidèles",
        "price": "",
        "description": "Avantage spécial de novembre. Renseignez-vous auprès de notre agence.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  },
  {
    "key": "online",
    "section": "online",
    "service_key": null,
    "position": 110,
    "enabled": true,
    "visible": true,
    "starts_on": null,
    "ends_on": null,
    "weekdays": [],
    "external_url": "",
    "copy": {
      "es": {
        "title": "Tienda online",
        "price": "",
        "description": "Compra productos para tus familiares en Cuba. Consulta disponibilidad y entrega rápida de 24 a 72 horas según el destino.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "en": {
        "title": "Online store",
        "price": "",
        "description": "Shop for family in Cuba. Ask about availability and delivery in 24 to 72 hours, depending on destination.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      },
      "fr": {
        "title": "Boutique en ligne",
        "price": "",
        "description": "Achetez des produits pour vos proches à Cuba. Renseignez-vous sur la disponibilité et la livraison en 24 à 72 heures selon la destination.",
        "terms": "",
        "delivery": "",
        "button": "",
        "message": ""
      }
    }
  }
]
$seed$::jsonb) as x(key text,section text,service_key text,position integer,enabled boolean,visible boolean,starts_on date,ends_on date,weekdays smallint[],external_url text,copy jsonb)
where s.slug='luxury-travel-point' on conflict (store_id,key) do nothing;
