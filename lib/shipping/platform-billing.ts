export type ShippingPlatformBilling = {
  enabled: boolean;
  fee_per_operation: number;
  currency: "USD";
  today_count: number;
  today_amount: number;
  month_count: number;
  month_amount: number;
  total_count: number;
  total_amount: number;
};
