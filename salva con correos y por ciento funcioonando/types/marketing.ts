export const MARKETING_PROMOTION_CATEGORIES = [
  "general",
  "express",
  "aereo",
  "maritimo",
  "miscelanea",
  "energia",
  "recogidas",
  "tienda",
] as const;

export type MarketingPromotionCategory =
  (typeof MARKETING_PROMOTION_CATEGORIES)[number];

export type MarketingPromotionDestination =
  | "whatsapp"
  | "url"
  | "call"
  | "email"
  | "none";

export type MarketingPromotion = {
  id: string;
  store_id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  button_text: string | null;
  destination_type: MarketingPromotionDestination;
  destination_url: string | null;
  destination_message: string | null;
  category: MarketingPromotionCategory;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_visible: boolean;
  is_featured: boolean;
  show_on_home: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingPromotionInput = Omit<
  MarketingPromotion,
  "id" | "created_at" | "updated_at" | "thumbnail_url"
> & {
  thumbnail_url?: string | null;
};
