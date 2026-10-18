export type Campaign = {
  id: string;
  store_id: string;
  title: string;
  body: string;
  poster_path: string;
  image_url: string;
  kind: "store" | "product" | "combo";
  item_id: string | null;
  active: boolean;
  created_at: string;
};
export type CampaignMetric = {
  visits: number;
  product_views: number;
  orders: number;
  paid_orders: number;
  paid_total: number;
  publications: number;
};
export type CampaignReport = {
  campaigns: (CampaignMetric & {
    campaign_id: string;
    title: string;
    active: boolean;
  })[];
  members: (CampaignMetric & { member_id: string; display_name: string })[];
  publications: (Omit<CampaignMetric, "publications"> & {
    id: string;
    url: string;
    campaign_id: string;
    campaign_title: string;
    member_id: string;
    display_name: string;
    title: string;
    network: string;
    active: boolean;
    created_at: string;
  })[];
  hasMore: boolean;
  periodDays: number;
};
