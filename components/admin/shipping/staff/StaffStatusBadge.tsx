import type { StaffStatus } from "@/lib/shipping/staff-types";
import { STAFF_STATUS_LABELS } from "@/lib/shipping/staff-types";

const styles: Record<StaffStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  VACATION: "bg-amber-100 text-amber-700 ring-amber-200",
  SUSPENDED: "bg-rose-100 text-rose-700 ring-rose-200",
};

export default function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${styles[status]}`}>
      {STAFF_STATUS_LABELS[status]}
    </span>
  );
}
