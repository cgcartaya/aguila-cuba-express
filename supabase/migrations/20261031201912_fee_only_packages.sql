ALTER TABLE public.shipments
  ADD COLUMN package_billing_mode text NOT NULL DEFAULT 'weight',
  ADD CONSTRAINT shipments_package_billing_mode_check CHECK (package_billing_mode IN ('weight','fees_only'));
COMMENT ON COLUMN public.shipments.package_billing_mode IS 'Package pricing: weight-based or fixed item charges only. Money-only operations keep weight default.';
