import type { DeliveryZone } from "@/lib/services/settings";

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;

  recipient_name: string;
  recipient_phone: string;
  recipient_phone_alt: string;

  city: string;
  reference: string;
  municipality: string;
  delivery_zone_id: string;
  exact_address: string;
  notes: string;
};

export type CheckoutCartItem = {
  id: string;
  name: string;
  price: number;
  base_price?: number;
  quantity: number;
  type: "product" | "combo";
  max_quantity_per_order?: number | null;
  minimum_order_exempt?: boolean | null;
  delivery_included?: boolean | null;
};

export type CheckoutTotals = {
  subtotal: number;
  minimumOrder: number;
  baseDeliveryFee: number;
  freeDeliveryFrom: number;
  hasFreeDelivery: boolean;
  shippingCost: number;
  finalTotal: number;
  missingAmount: number;
  minimumOrderExempt: boolean;
  deliveryIncludedForAllItems: boolean;
};

export type DeliveryAddressProps = {
  form: CheckoutForm;
  zones: DeliveryZone[];
  selectedZone: DeliveryZone | null;
  availableZones: DeliveryZone[];
  loadingZones: boolean;
  municipalityHasNoZones: boolean;
  showNotes?: boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
};
