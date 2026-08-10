export type ShippingDashboardStatusMetric = {
  status: string;
  label: string;
  count: number;
};

export type ShippingDashboardDayMetric = {
  date: string;
  label: string;
  created: number;
  delivered: number;
  billed: number;
};

export type ShippingDashboardDestinationMetric = {
  location: string;
  count: number;
  weight_lb: number;
  total_amount: number;
};

export type ShippingDashboardDriverMetric = {
  driver_id: string | null;
  driver_name: string;
  assigned: number;
  pending: number;
  delivered: number;
  issues: number;
  completion_rate: number;
};

export type ShippingDashboardRecentShipment = {
  id: string;
  order_number: number | null;
  tracking_code: string | null;
  recipient_name: string | null;
  sender_name: string | null;
  location: string;
  status: string;
  assigned_driver_name: string | null;
  service_price: number;
  balance_due: number;
  weight_lb: number;
  contains_package: boolean;
  contains_money: boolean;
  created_at: string;
};

export type ShippingDashboardSummary = {
  total_active: number;
  created_today: number;
  created_this_week: number;
  pending_total: number;
  delivered_total: number;
  delivered_today: number;
  issues_total: number;
  in_transit_total: number;
  received_cuba_total: number;
  out_for_delivery_total: number;
  unassigned_total: number;

  billed_today: number;
  billed_this_month: number;
  outstanding_total: number;
  paid_total: number;

  weight_today_lb: number;
  weight_this_month_lb: number;
  money_sent_today: number;
  money_sent_this_month: number;
};

export type ShippingDashboardData = {
  summary: ShippingDashboardSummary;
  statuses: ShippingDashboardStatusMetric[];
  last_7_days: ShippingDashboardDayMetric[];
  top_destinations: ShippingDashboardDestinationMetric[];
  drivers: ShippingDashboardDriverMetric[];
  recent_shipments: ShippingDashboardRecentShipment[];
};
