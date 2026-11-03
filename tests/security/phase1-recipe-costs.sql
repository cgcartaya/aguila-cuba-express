BEGIN;
INSERT INTO public.menu_categories(id,store_id,name) VALUES
('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000101','Fixture A'),
('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000102','Fixture B');
INSERT INTO public.menu_items(id,store_id,category_id,name,price,is_active) VALUES
('00000000-0000-4000-8000-000000000511','00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000501','Fixture A',10,true),
('00000000-0000-4000-8000-000000000512','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000502','Fixture B',20,false);
INSERT INTO public.restaurant_recipes(store_id,menu_item_id,packaging_cost) VALUES
('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000511',2),
('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000512',3);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000201',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.restaurant_recipe_costs)<>1 THEN RAISE EXCEPTION 'Owner cost scope failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.restaurant_recipe_costs WHERE recipe_unit_cost=2) THEN RAISE EXCEPTION 'Recipe cost changed'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000203',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.restaurant_recipe_costs)<>2 THEN RAISE EXCEPTION 'Super costs including inactive menu item failed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM * FROM public.restaurant_recipe_costs; RAISE EXCEPTION 'Anonymous costs leaked'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
