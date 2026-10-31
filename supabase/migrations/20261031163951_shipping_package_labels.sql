-- All shipping tenants. Database-generated numbers remain stable across edits
-- and reprints. Existing shipments receive a number as well.
ALTER TABLE public.shipments
  ADD COLUMN package_number bigint GENERATED ALWAYS AS IDENTITY,
  ADD COLUMN package_contents jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.shipments
  ADD CONSTRAINT shipments_package_number_key UNIQUE (package_number),
  ADD CONSTRAINT shipments_package_contents_array CHECK (
    CASE WHEN jsonb_typeof(package_contents) = 'array'
      THEN jsonb_array_length(package_contents) <= 100 ELSE false END
  );
COMMENT ON COLUMN public.shipments.package_number IS 'Permanent global package identifier; displayed only for shipments containing a package.';
COMMENT ON COLUMN public.shipments.package_contents IS 'Optional quantity/description packing list; independent of billed shipment_items and inventory.';
-- Existing get_public_shipping_invoice uses to_jsonb(v_shipment), therefore
-- includes these fields while retaining its deleted/public_tracking checks.
