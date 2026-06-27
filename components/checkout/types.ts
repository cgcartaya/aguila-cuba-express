import type { DeliveryZone } from "@/lib/services/settings";

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;

  recipient_name: string;
  recipient_phone: string;
  recipient_phone_alt: string;

  municipality: string;
  delivery_zone_id: string;
  exact_address: string;
  notes: string;
};

export type CheckoutCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "product" | "combo";
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
};

export type DeliveryAddressProps = {
  form: CheckoutForm;
  zones: DeliveryZone[];
  selectedZone: DeliveryZone | null;
  availableZones: DeliveryZone[];
  loadingZones: boolean;
  municipalityHasNoZones: boolean;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => void;
};