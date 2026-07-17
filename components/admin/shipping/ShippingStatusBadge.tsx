import { getShippingStatusLabel } from "@/lib/shipping/types";

export default function ShippingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    received_miami: "bg-slate-100 text-slate-700",
    preparing: "bg-amber-100 text-amber-800",
    in_transit: "bg-violet-100 text-violet-800",
    received_cuba: "bg-blue-100 text-blue-800",
    out_for_delivery: "bg-cyan-100 text-cyan-800",
    delivered: "bg-emerald-100 text-emerald-800",
    issue: "bg-red-100 text-red-700",
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-black ${styles[status] || "bg-slate-100 text-slate-700"}`}>{getShippingStatusLabel(status)}</span>;
}
