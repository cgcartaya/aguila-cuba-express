-- Preserve existing charges as one unit. New selected fees can charge multiple units.
ALTER TABLE public.shipment_extra_fees
  ADD COLUMN quantity integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT shipment_extra_fees_quantity_check CHECK (quantity BETWEEN 1 AND 9999);
COMMENT ON COLUMN public.shipment_extra_fees.quantity IS 'Number of units charged for the selected extra fee; existing fees default to one.';
