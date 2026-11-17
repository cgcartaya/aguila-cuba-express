export type SalesPerson = {
  key: string;
  name: string;
  role: string;
  active?: boolean;
};
export type PersonSales = {
  seller_key: string;
  seller_name: string;
  pending: number;
  confirmed: number;
  units: number;
  amount: number;
};
export type MonthlySalesOrder = {
  id: string;
  order_number: string;
  seller_key: string;
  state: string;
  origin: string;
  date: string;
  total: number;
};
export type MonthlySalesReport = {
  rows: PersonSales[];
  orders: MonthlySalesOrder[];
  legacy_count: number;
  timezone: string;
};
export type SalesPersonRow = SalesPerson & {
  pending: number;
  confirmed: number;
  units: number;
  amount: number;
};
export type SalesReportResponse = {
  sellers: SalesPerson[];
  report: MonthlySalesReport;
  year: number;
  month: number;
};

export function currentSalesMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Havana",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}`;
}

/** Include people with zero sales and preserve historical/inactive attribution. */
export function salesPeopleRows(
  sellers: SalesPerson[],
  rows: PersonSales[],
): SalesPersonRow[] {
  const result = new Map<string, SalesPersonRow>(
    sellers.map((s) => [
      s.key,
      { ...s, pending: 0, confirmed: 0, units: 0, amount: 0 },
    ]),
  );
  for (const row of rows) {
    const person = result.get(row.seller_key);
    result.set(row.seller_key, {
      key: row.seller_key,
      name: person?.name || row.seller_name || "Sin atribuir",
      role:
        person?.role ||
        (row.seller_key.startsWith("member:")
          ? "Gestor"
          : row.seller_key.startsWith("user:")
            ? "Personal de LYM"
            : "Sin atribuir"),
      active: person?.active,
      pending: Number(row.pending || 0),
      confirmed: Number(row.confirmed || 0),
      units: Number(row.units || 0),
      amount: Number(row.amount || 0),
    });
  }
  return [...result.values()].sort(
    (a, b) =>
      b.amount - a.amount ||
      b.confirmed - a.confirmed ||
      a.name.localeCompare(b.name, "es"),
  );
}
export function salesTotals(rows: SalesPersonRow[]) {
  return rows.reduce(
    (sum, row) => ({
      pending: sum.pending + row.pending,
      confirmed: sum.confirmed + row.confirmed,
      units: sum.units + row.units,
      amount: sum.amount + row.amount,
    }),
    { pending: 0, confirmed: 0, units: 0, amount: 0 },
  );
}
