// Only customer-entered fields may be carried from a landing into the shared planner.
// Tenant, coverage and pricing always come from the planner's configured store.
export type PickupPlannerPrefill = {
  customerName: string;
  phone: string;
  address: string;
  packageCount: string;
  preferredDate: string;
};

export function preparePickupPrefill(input: PickupPlannerPrefill) {
  const address = input.address.trim().slice(0, 250);
  const zip = address.match(/[,\s]+(\d{5}(?:-\d{4})?)$/);
  const count = Number(input.packageCount);
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(input.preferredDate) &&
    !Number.isNaN(Date.parse(`${input.preferredDate}T12:00:00Z`))
      ? input.preferredDate
      : null;
  return {
    form: {
      customer_name: input.customerName.trim().slice(0, 120),
      phone: input.phone.trim().slice(0, 30),
      address_line_1: zip
        ? address.slice(0, zip.index).replace(/[,\s]+$/, "")
        : address,
      postal_code: zip?.[1] || "",
      package_count: String(
        Number.isFinite(count)
          ? Math.max(1, Math.min(99, Math.floor(count)))
          : 1,
      ),
    },
    selectedDates: date ? [date] : [],
  };
}
