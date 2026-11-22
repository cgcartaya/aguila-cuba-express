-- Apply after publishing the checkout and produce photos.
create temporary table xpress_produce_provinces (code text primary key, name text) on commit drop;
insert into xpress_produce_provinces values
  ('pinar-del-rio', 'Pinar del Río'),
  ('artemisa', 'Artemisa'),
  ('la-habana', 'La Habana'),
  ('mayabeque', 'Mayabeque'),
  ('matanzas', 'Matanzas'),
  ('cienfuegos', 'Cienfuegos'),
  ('villa-clara', 'Villa Clara'),
  ('sancti-spiritus', 'Sancti Spíritus'),
  ('ciego-de-avila', 'Ciego de Ávila'),
  ('camaguey', 'Camagüey'),
  ('las-tunas', 'Las Tunas'),
  ('holguin', 'Holguín'),
  ('granma', 'Granma'),
  ('santiago-de-cuba', 'Santiago de Cuba'),
  ('guantanamo', 'Guantánamo'),
  ('isla-de-la-juventud', 'Isla de la Juventud');

-- A null fee represents a destination marked NO for Express in the agency's fee sheet.
create temporary table xpress_produce_delivery (
  province_code text, code text, name text, fee numeric, primary key (province_code, code)
) on commit drop;
insert into xpress_produce_delivery values
  ('pinar-del-rio', 'pinar-del-rio', 'Pinar del Río', 50),
  ('pinar-del-rio', 'consolacion-del-sur', 'Consolación del Sur', 40),
  ('pinar-del-rio', 'guane', 'Guane', 80),
  ('pinar-del-rio', 'la-palma', 'La Palma', 45),
  ('pinar-del-rio', 'los-palacios', 'Los Palacios', 35),
  ('pinar-del-rio', 'mantua', 'Mantua', 85),
  ('pinar-del-rio', 'minas-de-matahambre', 'Minas de Matahambre', 75),
  ('pinar-del-rio', 'san-juan-y-martinez', 'San Juan y Martínez', 70),
  ('pinar-del-rio', 'san-luis', 'San Luis', 60),
  ('pinar-del-rio', 'sandino', 'Sandino', 85),
  ('pinar-del-rio', 'vinales', 'Viñales', 60),
  ('artemisa', 'artemisa', 'Artemisa', 25),
  ('artemisa', 'alquizar', 'Alquízar', 25),
  ('artemisa', 'bahia-honda', 'Bahía Honda', 50),
  ('artemisa', 'bauta', 'Bauta', 25),
  ('artemisa', 'caimito', 'Caimito', 25),
  ('artemisa', 'candelaria', 'Candelaria', 45),
  ('artemisa', 'guanajay', 'Guanajay', 25),
  ('artemisa', 'guira-de-melena', 'Güira de Melena', 25),
  ('artemisa', 'mariel', 'Mariel', 30),
  ('artemisa', 'san-antonio-de-los-banos', 'San Antonio de los Baños', 25),
  ('artemisa', 'san-cristobal', 'San Cristóbal', 40),
  ('la-habana', 'plaza-de-la-revolucion', 'Plaza de la Revolución', 10),
  ('la-habana', 'arroyo-naranjo', 'Arroyo Naranjo', 10),
  ('la-habana', 'boyeros', 'Boyeros', 10),
  ('la-habana', 'centro-habana', 'Centro Habana', 10),
  ('la-habana', 'cerro', 'Cerro', 10),
  ('la-habana', 'cotorro', 'Cotorro', 10),
  ('la-habana', 'diez-de-octubre', 'Diez de Octubre', 10),
  ('la-habana', 'guanabacoa', 'Guanabacoa', 10),
  ('la-habana', 'la-habana-del-este', 'La Habana del Este', 10),
  ('la-habana', 'la-habana-vieja', 'La Habana Vieja', 10),
  ('la-habana', 'la-lisa', 'La Lisa', 10),
  ('la-habana', 'marianao', 'Marianao', 10),
  ('la-habana', 'playa', 'Playa', 10),
  ('la-habana', 'regla', 'Regla', 10),
  ('la-habana', 'san-miguel-del-padron', 'San Miguel del Padrón', 10),
  ('mayabeque', 'san-jose-de-las-lajas', 'San José de las Lajas', 25),
  ('mayabeque', 'batabano', 'Batabanó', 25),
  ('mayabeque', 'bejucal', 'Bejucal', 25),
  ('mayabeque', 'guines', 'Güines', 25),
  ('mayabeque', 'jaruco', 'Jaruco', 25),
  ('mayabeque', 'madruga', 'Madruga', 25),
  ('mayabeque', 'melena-del-sur', 'Melena del Sur', 25),
  ('mayabeque', 'nueva-paz', 'Nueva Paz', 30),
  ('mayabeque', 'quivican', 'Quivicán', 25),
  ('mayabeque', 'san-nicolas', 'San Nicolás', 30),
  ('mayabeque', 'santa-cruz-del-norte', 'Santa Cruz del Norte', 30),
  ('matanzas', 'matanzas', 'Matanzas', 25),
  ('matanzas', 'calimete', 'Calimete', 45),
  ('matanzas', 'cardenas', 'Cárdenas', 30),
  ('matanzas', 'cienaga-de-zapata', 'Ciénaga de Zapata', 42),
  ('matanzas', 'colon', 'Colón', 30),
  ('matanzas', 'jaguey-grande', 'Jagüey Grande', 40),
  ('matanzas', 'jovellanos', 'Jovellanos', 30),
  ('matanzas', 'limonar', 'Limonar', 30),
  ('matanzas', 'los-arabos', 'Los Arabos', 45),
  ('matanzas', 'marti', 'Martí', 40),
  ('matanzas', 'pedro-betancourt', 'Pedro Betancourt', 35),
  ('matanzas', 'perico', 'Perico', 35),
  ('matanzas', 'union-de-reyes', 'Unión de Reyes', 30),
  ('cienfuegos', 'cienfuegos', 'Cienfuegos', 25),
  ('cienfuegos', 'abreus', 'Abreus', 35),
  ('cienfuegos', 'aguada-de-pasajeros', 'Aguada de Pasajeros', 35),
  ('cienfuegos', 'cruces', 'Cruces', 35),
  ('cienfuegos', 'cumanayagua', 'Cumanayagua', 35),
  ('cienfuegos', 'lajas', 'Lajas', 35),
  ('cienfuegos', 'palmira', 'Palmira', 35),
  ('cienfuegos', 'rodas', 'Rodas', 35),
  ('villa-clara', 'santa-clara', 'Santa Clara', 25),
  ('villa-clara', 'caibarien', 'Caibarién', 42),
  ('villa-clara', 'camajuani', 'Camajuaní', 35),
  ('villa-clara', 'cifuentes', 'Cifuentes', 35),
  ('villa-clara', 'corralillo', 'Corralillo', 40),
  ('villa-clara', 'encrucijada', 'Encrucijada', 35),
  ('villa-clara', 'manicaragua', 'Manicaragua', 35),
  ('villa-clara', 'placetas', 'Placetas', 35),
  ('villa-clara', 'quemado-de-guines', 'Quemado de Güines', 42),
  ('villa-clara', 'ranchuelo', 'Ranchuelo', 35),
  ('villa-clara', 'remedios', 'Remedios', 35),
  ('villa-clara', 'sagua-la-grande', 'Sagua la Grande', 42),
  ('villa-clara', 'santo-domingo', 'Santo Domingo', 42),
  ('sancti-spiritus', 'sancti-spiritus', 'Sancti Spíritus', 25),
  ('sancti-spiritus', 'cabaiguan', 'Cabaiguán', 35),
  ('sancti-spiritus', 'fomento', 'Fomento', 35),
  ('sancti-spiritus', 'jatibonico', 'Jatibonico', 35),
  ('sancti-spiritus', 'la-sierpe', 'La Sierpe', 35),
  ('sancti-spiritus', 'taguasco', 'Taguasco', 35),
  ('sancti-spiritus', 'trinidad', 'Trinidad', 50),
  ('sancti-spiritus', 'yaguajay', 'Yaguajay', 50),
  ('ciego-de-avila', 'ciego-de-avila', 'Ciego de Ávila', 25),
  ('ciego-de-avila', 'baragua', 'Baraguá', 35),
  ('ciego-de-avila', 'bolivia', 'Bolivia', 60),
  ('ciego-de-avila', 'chambas', 'Chambas', 55),
  ('ciego-de-avila', 'ciro-redondo', 'Ciro Redondo', 30),
  ('ciego-de-avila', 'florencia', 'Florencia', 55),
  ('ciego-de-avila', 'majagua', 'Majagua', 35),
  ('ciego-de-avila', 'moron', 'Morón', 40),
  ('ciego-de-avila', 'primero-de-enero', 'Primero de Enero', 50),
  ('ciego-de-avila', 'venezuela', 'Venezuela', 40),
  ('camaguey', 'camaguey', 'Camagüey', 25),
  ('camaguey', 'carlos-manuel-de-cespedes', 'Carlos Manuel de Céspedes', 35),
  ('camaguey', 'esmeralda', 'Esmeralda', 50),
  ('camaguey', 'florida', 'Florida', 35),
  ('camaguey', 'guaimaro', 'Guáimaro', 42),
  ('camaguey', 'jimaguayu', 'Jimaguayú', 35),
  ('camaguey', 'minas', 'Minas', 35),
  ('camaguey', 'najasa', 'Najasa', 35),
  ('camaguey', 'nuevitas', 'Nuevitas', 45),
  ('camaguey', 'santa-cruz-del-sur', 'Santa Cruz del Sur', 40),
  ('camaguey', 'sibanicu', 'Sibanicú', 35),
  ('camaguey', 'sierra-de-cubitas', 'Sierra de Cubitas', 35),
  ('camaguey', 'vertientes', 'Vertientes', 35),
  ('las-tunas', 'las-tunas', 'Las Tunas', 25),
  ('las-tunas', 'amancio', 'Amancio', 40),
  ('las-tunas', 'colombia', 'Colombia', 35),
  ('las-tunas', 'jesus-menendez', 'Jesús Menéndez', 35),
  ('las-tunas', 'jobabo', 'Jobabo', 35),
  ('las-tunas', 'majibacoa', 'Majibacoa', 35),
  ('las-tunas', 'manati', 'Manatí', 35),
  ('las-tunas', 'puerto-padre', 'Puerto Padre', 35),
  ('holguin', 'holguin', 'Holguín', 25),
  ('holguin', 'antilla', 'Antilla', 40),
  ('holguin', 'baguanos', 'Báguanos', 35),
  ('holguin', 'banes', 'Banes', 40),
  ('holguin', 'cacocum', 'Cacocum', 35),
  ('holguin', 'calixto-garcia', 'Calixto García', 35),
  ('holguin', 'cueto', 'Cueto', 35),
  ('holguin', 'frank-pais', 'Frank País', 45),
  ('holguin', 'gibara', 'Gibara', 35),
  ('holguin', 'mayari', 'Mayarí', 40),
  ('holguin', 'moa', 'Moa', 70),
  ('holguin', 'rafael-freyre', 'Rafael Freyre', 35),
  ('holguin', 'sagua-de-tanamo', 'Sagua de Tánamo', 55),
  ('holguin', 'urbano-noris', 'Urbano Noris', 35),
  ('granma', 'bayamo', 'Bayamo', 25),
  ('granma', 'bartolome-maso', 'Bartolomé Masó', 35),
  ('granma', 'buey-arriba', 'Buey Arriba', 35),
  ('granma', 'campechuela', 'Campechuela', 50),
  ('granma', 'cauto-cristo', 'Cauto Cristo', 35),
  ('granma', 'guisa', 'Guisa', 35),
  ('granma', 'jiguani', 'Jiguaní', 35),
  ('granma', 'manzanillo', 'Manzanillo', 40),
  ('granma', 'media-luna', 'Media Luna', 58),
  ('granma', 'niquero', 'Niquero', 70),
  ('granma', 'pilon', 'Pilón', 78),
  ('granma', 'rio-cauto', 'Río Cauto', 35),
  ('granma', 'yara', 'Yara', 35),
  ('santiago-de-cuba', 'santiago-de-cuba', 'Santiago de Cuba', 25),
  ('santiago-de-cuba', 'contramaestre', 'Contramaestre', 40),
  ('santiago-de-cuba', 'guama', 'Guamá', 40),
  ('santiago-de-cuba', 'mella', 'Mella', 40),
  ('santiago-de-cuba', 'palma-soriano', 'Palma Soriano', 35),
  ('santiago-de-cuba', 'san-luis', 'San Luis', 35),
  ('santiago-de-cuba', 'segundo-frente', 'Segundo Frente', 35),
  ('santiago-de-cuba', 'songo-la-maya', 'Songo-La Maya', 35),
  ('santiago-de-cuba', 'tercer-frente', 'Tercer Frente', 40),
  ('guantanamo', 'guantanamo', 'Guantánamo', 25),
  ('guantanamo', 'baracoa', 'Baracoa', null),
  ('guantanamo', 'caimanera', 'Caimanera', 50),
  ('guantanamo', 'el-salvador', 'El Salvador', 35),
  ('guantanamo', 'imias', 'Imías', null),
  ('guantanamo', 'maisi', 'Maisí', null),
  ('guantanamo', 'manuel-tames', 'Manuel Tames', 35),
  ('guantanamo', 'niceto-perez', 'Niceto Pérez', 35),
  ('guantanamo', 'san-antonio-del-sur', 'San Antonio del Sur', null),
  ('guantanamo', 'yateras', 'Yateras', null);

insert into public.shipping_provinces (store_id, country_id, name, code)
select s.id, c.id, src.name, src.code
from public.stores s
join public.shipping_countries c on c.store_id = s.id and upper(c.code) = 'CU' and c.is_active
cross join xpress_produce_provinces src
where s.slug = 'xpress'
on conflict (store_id, country_id, code) do nothing;

insert into public.shipping_municipalities (store_id, province_id, name, code)
select s.id, p.id, src.name, src.code
from public.stores s
join public.shipping_countries c on c.store_id = s.id and upper(c.code) = 'CU' and c.is_active
join public.shipping_provinces p on p.store_id = s.id and p.country_id = c.id
join xpress_produce_delivery src on src.province_code = p.code
where s.slug = 'xpress'
on conflict (store_id, province_id, code) do nothing;

insert into public.shipping_rates (
  store_id, scope_type, municipality_id, service_type_id, transport_mode,
  rate_per_lb, minimum_weight_lb, maximum_weight_lb, minimum_charge, fixed_fee,
  weight_threshold_lb, rate_at_or_above_threshold, estimated_days_min, estimated_days_max
)
select s.id, 'municipality', m.id, t.id, base.transport_mode,
  base.rate_per_lb, base.minimum_weight_lb, base.maximum_weight_lb,
  base.minimum_charge, d.fee, base.weight_threshold_lb, base.rate_at_or_above_threshold,
  case when t.code = 'xpress-frutas' then case when p.code = 'la-habana' then 1 else 2 end else base.estimated_days_min end,
  case when t.code = 'xpress-frutas' then case when p.code = 'la-habana' then 1 else 3 end else base.estimated_days_max end
from public.stores s
join public.shipping_countries c on c.store_id = s.id and upper(c.code) = 'CU' and c.is_active
join public.shipping_provinces p on p.store_id = s.id and p.country_id = c.id and p.is_active
join public.shipping_municipalities m on m.store_id = s.id and m.province_id = p.id and m.is_active
join xpress_produce_delivery d on d.province_code = p.code and d.code = m.code and d.fee is not null
join public.shipping_rates base on base.store_id = s.id and base.country_id = c.id
  and base.scope_type = 'country' and base.is_active and base.transport_mode = 'express'
join public.shipping_service_types t on t.id = base.service_type_id
  and t.store_id = s.id and t.code like 'xpress-%' and t.is_active and t.billing_mode = 'per_lb'
where s.slug = 'xpress'
on conflict (store_id, municipality_id, service_type_id, transport_mode)
  where scope_type = 'municipality' do update set fixed_fee = excluded.fixed_fee;

insert into public.shipping_rates (
  store_id, scope_type, province_id, service_type_id, transport_mode,
  rate_per_lb, minimum_weight_lb, maximum_weight_lb, minimum_charge, fixed_fee,
  weight_threshold_lb, rate_at_or_above_threshold, estimated_days_min, estimated_days_max
)
select s.id, 'province', p.id, t.id, base.transport_mode,
  base.rate_per_lb, base.minimum_weight_lb, base.maximum_weight_lb,
  base.minimum_charge, 10, base.weight_threshold_lb, base.rate_at_or_above_threshold,
  base.estimated_days_min, base.estimated_days_max
from public.stores s
join public.shipping_countries c on c.store_id = s.id and upper(c.code) = 'CU' and c.is_active
join public.shipping_provinces p on p.store_id = s.id and p.country_id = c.id and p.is_active
join xpress_produce_provinces src on src.code = p.code
join public.shipping_rates base on base.store_id = s.id and base.country_id = c.id
  and base.scope_type = 'country' and base.is_active and base.transport_mode in ('air','sea')
join public.shipping_service_types t on t.id = base.service_type_id
  and t.store_id = s.id and t.code like 'xpress-%' and t.is_active and t.billing_mode = 'per_lb'
where s.slug = 'xpress'
on conflict (store_id, province_id, service_type_id, transport_mode)
  where scope_type = 'province' do update set fixed_fee = excluded.fixed_fee;

insert into public.categories (store_id, name, slug, color)
select id, 'Frutas frescas', 'frutas-frescas', '#2B7536' from public.stores where slug = 'xpress'
on conflict (store_id, slug) do nothing;

with produce(code, name, weight, price) as (values
  ('bananas', 'Bananas', 4, 6),
  ('pina', 'Piña', 6, 4),
  ('naranjas', 'Naranjas', 5.5, 10),
  ('mandarinas', 'Mandarinas', 3.5, 8),
  ('limones', 'Limones verdes', 3.5, 7),
  ('limones-amarillos', 'Limones amarillos', 3.5, 8),
  ('uvas-verdes', 'Uvas verdes', 3.5, 10),
  ('uvas-rojas', 'Uvas rojas', 3.5, 10),
  ('fresas', 'Fresas', 2.5, 12),
  ('manzanas', 'Manzanas', 4.5, 9),
  ('peras', 'Peras', 5, 12),
  ('duraznos', 'Duraznos', 4.5, 14),
  ('fruta-del-dragon', 'Fruta del dragón', 2.5, 12),
  ('kiwi', 'Kiwi', 3.8, 12),
  ('caqui', 'Caqui (persimmon)', 2.5, 9),
  ('mazorcas', 'Mazorcas', 3, 10),
  ('ajies', 'Ajíes', 3, 10),
  ('cebolla-morada', 'Cebolla morada', 6, 7),
  ('cebolla-blanca', 'Cebolla blanca', 6, 7),
  ('ajo-pelado', 'Ajo pelado', 3.5, 15),
  ('ajos', 'Ajos', 2.5, 8),
  ('papas', 'Papas', 10, 10),
  ('pera-asiatica', 'Pera asiática', 5, 10),
  ('cranberries', 'Cranberries (arándanos rojos)', 2.5, 12)
)
insert into public.products (
  store_id, category, sku, name, description, price, weight, weight_unit, stock, is_active, image_url
)
select s.id, c.name, 'XPRESS-FRESH-' || p.code, p.name || ' · ' || p.weight || ' lb',
  'Presentación de ' || p.weight || ' lb. Envío Express prioritario. La Habana: 24 horas. Otras provincias: 48–72 horas.',
  p.price, p.weight, 'lb', 1000, true,
  'https://xpress.perlamarketplace.com/xpress/frutas-frescas/' || p.code || '.webp'
from public.stores s
join public.categories c on c.store_id = s.id and c.slug = 'frutas-frescas'
cross join produce p
where s.slug = 'xpress' and not exists (
  select 1 from public.products existing
  where existing.store_id = s.id and existing.sku = 'XPRESS-FRESH-' || p.code
);
