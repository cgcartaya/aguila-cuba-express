"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Users } from "lucide-react";
import { lymFetch } from "@/lib/lym/client";
import {
  currentSalesMonth,
  salesPeopleRows,
  salesTotals,
  type SalesReportResponse,
} from "@/lib/lym/sales-report";

const money = (amount: number) =>
  new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" }).format(
    Number(amount || 0),
  );
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es", {
    timeZone: "America/Havana",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
const field =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900";

export default function LymSalesReport({
  storeId,
  refreshToken = 0,
}: {
  storeId: string;
  refreshToken?: number;
}) {
  const [month, setMonth] = useState(() => currentSalesMonth());
  const [response, setResponse] = useState<SalesReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [person, setPerson] = useState("");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    let current = true;
    const [year, selectedMonth] = month.split("-");
    setLoading(true);
    setError("");
    setResponse(null);
    void lymFetch(
      `?${new URLSearchParams({ view: "sales", storeId, year, month: selectedMonth })}`,
    )
      .then((data) => {
        if (current) setResponse(data);
      })
      .catch((error) => {
        if (current)
          setError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las ventas.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [storeId, month, version, refreshToken]);

  const rows = useMemo(
    () => salesPeopleRows(response?.sellers || [], response?.report.rows || []),
    [response],
  );
  const visibleRows = rows.filter(
    (row) =>
      (!person || row.key === person) &&
      `${row.name} ${row.role}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  );
  const totals = salesTotals(rows);
  const filteredTotals = salesTotals(visibleRows);
  const keys = new Set(visibleRows.map((row) => row.key));
  const detail = (response?.report.orders || []).filter(
    (order) => keys.has(order.seller_key) && (!state || order.state === state),
  );
  const names = new Map(rows.map((row) => [row.key, row.name]));

  return (
    <section
      className="space-y-5 text-slate-900"
      aria-labelledby="lym-sales-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
            <BarChart3 size={16} /> Ventas de LYM
          </p>
          <h2 id="lym-sales-title" className="mt-2 text-2xl font-black">
            Ventas por persona
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Consulta las ventas atribuidas a cada gestor, a la jefa y a la
            trabajadora de tienda física. Se cuenta la persona seleccionada en
            «Venta de», aunque otra persona haya registrado o confirmado la
            orden.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          disabled={loading}
          onClick={() => setVersion((v) => v + 1)}
        >
          <RefreshCw size={16} />
          Actualizar ventas
        </button>
      </header>
      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          Mes y año
          <input
            aria-label="Mes y año de las ventas"
            className={field}
            type="month"
            min="2000-01"
            max="2100-12"
            value={month}
            onChange={(e) => {
              if (/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(e.target.value))
                setMonth(e.target.value);
            }}
          />
        </label>
        <label className="text-sm font-semibold">
          Venta de
          <select
            className={field}
            value={person}
            onChange={(e) => setPerson(e.target.value)}
          >
            <option value="">Todas las personas</option>
            {rows.map((row) => (
              <option key={row.key} value={row.key}>
                {row.name} · {row.role}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Buscar persona
          <input
            className={field}
            type="search"
            value={search}
            placeholder="Nombre del gestor o de la trabajadora"
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <p className="text-sm leading-6 text-slate-500">
        Las ventas se ubican en el mes de su confirmación, según la hora de
        Cuba. Las solicitudes pendientes se muestran por el mes de creación. Las
        canceladas o devueltas no suman ventas.
      </p>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
          <button
            type="button"
            className="ml-3 font-bold underline"
            onClick={() => setVersion((v) => v + 1)}
          >
            Reintentar
          </button>
        </div>
      )}
      {loading ? (
        <p
          role="status"
          className="rounded-2xl border bg-white p-6 text-sm text-slate-500"
        >
          Cargando ventas del mes…
        </p>
      ) : (
        response && (
          <>
            <div
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Total general de LYM"
            >
              {[
                ["Ventas confirmadas", totals.confirmed],
                ["Unidades vendidas", totals.units],
                ["Importe confirmado", money(totals.amount)],
                ["Solicitudes pendientes", totals.pending],
              ].map(([label, value]) => (
                <div
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                  key={label}
                >
                  <p className="text-xs font-bold text-slate-500">
                    {label} · Total LYM
                  </p>
                  <strong className="mt-2 block text-2xl font-black">
                    {value}
                  </strong>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <caption className="p-4 text-left font-bold">
                  Ventas registradas a nombre de cada persona · {month}
                </caption>
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {[
                      "Persona",
                      "Tipo",
                      "Pendientes",
                      "Ventas confirmadas",
                      "Unidades",
                      "Importe",
                      "Detalle",
                    ].map((label) => (
                      <th
                        scope="col"
                        className="whitespace-nowrap px-4 py-3"
                        key={label}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length ? (
                    visibleRows.map((row) => (
                      <tr key={row.key} className="border-t border-slate-100">
                        <th scope="row" className="px-4 py-3 font-bold">
                          {row.name}
                          {row.active === false && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              Inactivo
                            </span>
                          )}
                        </th>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                          {row.role}
                        </td>
                        <td className="px-4 py-3">{row.pending}</td>
                        <td className="px-4 py-3 font-bold">{row.confirmed}</td>
                        <td className="px-4 py-3">{row.units}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold">
                          {money(row.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="whitespace-nowrap font-bold text-blue-700 underline"
                            onClick={() => {
                              setPerson(row.key);
                              setSearch("");
                              document
                                .getElementById("lym-person-sales-detail")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                            }}
                          >
                            Ver órdenes
                            <span className="sr-only"> de {row.name}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-6 text-center text-slate-500"
                      >
                        No hay personas que coincidan con el filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t bg-slate-50 font-bold">
                  <tr>
                    <th scope="row" className="px-4 py-3" colSpan={2}>
                      {person || search
                        ? "Total del filtro"
                        : "Total general LYM"}
                    </th>
                    <td className="px-4 py-3">{filteredTotals.pending}</td>
                    <td className="px-4 py-3">{filteredTotals.confirmed}</td>
                    <td className="px-4 py-3">{filteredTotals.units}</td>
                    <td className="px-4 py-3">
                      {money(filteredTotals.amount)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {!!response.report.legacy_count && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Hay {response.report.legacy_count} órdenes históricas sin fecha
                fiable de confirmación, excluidas del total mensual.
              </p>
            )}
            <div id="lym-person-sales-detail" className="scroll-mt-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-black">
                  <Users size={18} />
                  {person
                    ? `Órdenes de ${names.get(person) || "la persona seleccionada"}`
                    : "Órdenes del mes"}
                </h3>
                <label className="text-sm font-semibold">
                  Estado del detalle
                  <select
                    className={field}
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="">Todas las solicitudes y ventas</option>
                    <option value="confirmed">Ventas confirmadas</option>
                    <option value="pending">Solicitudes pendientes</option>
                  </select>
                </label>
              </div>
              {detail.length ? (
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Orden",
                          "Venta de",
                          "Estado",
                          "Origen",
                          "Fecha",
                          "Total",
                        ].map((label) => (
                          <th scope="col" className="px-4 py-3" key={label}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.map((order) => (
                        <tr key={order.id} className="border-t">
                          <td className="px-4 py-3">
                            <a
                              className="font-bold text-blue-700 underline"
                              href={`/admin/orders?orderId=${encodeURIComponent(order.id)}`}
                            >
                              {order.order_number}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            {names.get(order.seller_key) || "Sin atribuir"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${order.state === "confirmed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                            >
                              {order.state === "confirmed"
                                ? "Venta confirmada"
                                : "Solicitud pendiente"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {order.origin === "manual"
                              ? "Manual"
                              : order.origin === "web"
                                ? "Web"
                                : "Histórica"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(order.date)}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {money(order.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                  No hay órdenes en este mes para la selección actual.
                </p>
              )}
            </div>
          </>
        )
      )}
    </section>
  );
}
