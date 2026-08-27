"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Lightbulb,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  WalletCards,
  X,
} from "lucide-react";
import {
  createEconomyExpense,
  deleteEconomyExpense,
  getEconomyExpenses,
  getEconomyModuleStatus,
  getEconomyProducts,
  getEconomySnapshot,
  updateEconomySettings,
  upsertProductFinancial,
  type EconomyExpense,
  type EconomyProduct,
  type EconomySettings,
  type EconomySnapshot,
} from "@/lib/services/economy";

const EXPENSE_CATEGORIES = [
  "Mercancía",
  "Transporte",
  "Embalaje",
  "Nómina",
  "Alquiler",
  "Electricidad",
  "Publicidad",
  "Comisiones",
  "Delivery",
  "Mantenimiento",
  "Impuestos",
  "Otros",
];

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: dateInput(start), end: dateInput(end) };
}

function pct(value: number) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function productNumbers(product: EconomyProduct) {
  const sale = Number(product.price || 0);
  const current = Number(product.financial?.current_unit_cost || 0);
  const extra = Number(product.financial?.extra_unit_cost || 0);
  const cost = current + extra;
  const gain = sale - cost;
  const margin = sale > 0 ? (gain / sale) * 100 : 0;
  const roi = cost > 0 ? (gain / cost) * 100 : 0;
  const invested = cost * Math.max(0, product.stock);
  const potentialSales = sale * Math.max(0, product.stock);
  const potentialGain = gain * Math.max(0, product.stock);
  return { sale, cost, gain, margin, roi, invested, potentialSales, potentialGain };
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CircleDollarSign;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums text-[#061b3a]">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

export default function EconomyDashboard({
  storeId,
  storeName,
}: {
  storeId: string;
  storeName: string;
}) {
  const defaults = useMemo(() => initialDates(), []);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [settings, setSettings] = useState<EconomySettings | null>(null);
  const [products, setProducts] = useState<EconomyProduct[]>([]);
  const [expenses, setExpenses] = useState<EconomyExpense[]>([]);
  const [snapshot, setSnapshot] = useState<EconomySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"summary" | "products" | "expenses" | "insights">("summary");
  const [search, setSearch] = useState("");
  const [editingProduct, setEditingProduct] = useState<EconomyProduct | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);

  async function loadData(showFullLoader = false) {
    try {
      if (showFullLoader) setLoading(true);
      else setRefreshing(true);
      setError("");

      const [newSettings, newProducts, newExpenses] = await Promise.all([
        getEconomyModuleStatus(storeId),
        getEconomyProducts(storeId),
        getEconomyExpenses(storeId, startDate, endDate),
      ]);

      const newSnapshot = await getEconomySnapshot(
        storeId,
        newProducts,
        startDate,
        endDate,
        newExpenses
      );

      setSettings(newSettings);
      setProducts(newProducts);
      setExpenses(newExpenses);
      setSnapshot(newSnapshot);
    } catch (err) {
      console.error("Error cargando Economía:", err);
      setError("No se pudo cargar la información económica.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, startDate, endDate]);

  const currency = settings?.economy_currency || "USD";
  const money = useMemo(
    () =>
      new Intl.NumberFormat(currency === "CUP" ? "es-CU" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "CUP" ? 0 : 2,
      }),
    [currency]
  );

  const inventory = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        const n = productNumbers(product);
        acc.invested += n.invested;
        acc.potentialSales += n.potentialSales;
        acc.potentialGain += n.potentialGain;
        return acc;
      },
      { invested: 0, potentialSales: 0, potentialGain: 0 }
    );
  }, [products]);

  const configuredProducts = products.filter(
    (product) => product.financial && productNumbers(product).cost > 0
  );
  const avgMargin = configuredProducts.length
    ? configuredProducts.reduce((sum, product) => sum + productNumbers(product).margin, 0) /
      configuredProducts.length
    : 0;

  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [product.name, product.category, product.sku]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const insights = useMemo(() => {
    const result: Array<{ tone: "danger" | "warning" | "good" | "info"; title: string; text: string }> = [];
    const noCost = products.filter((p) => !p.financial || productNumbers(p).cost <= 0);
    if (noCost.length) {
      result.push({
        tone: "warning",
        title: `${noCost.length} producto${noCost.length === 1 ? "" : "s"} sin costo configurado`,
        text: "Completa su costo para que la ganancia, el inventario invertido y las recomendaciones sean más precisas.",
      });
    }

    products.forEach((product) => {
      const n = productNumbers(product);
      if (n.cost <= 0 || n.sale <= 0) return;
      const min = Number(product.financial?.minimum_margin ?? 15);
      const target = Number(product.financial?.target_margin ?? settings?.economy_target_margin ?? 30);
      if (n.margin < 0) {
        result.push({
          tone: "danger",
          title: `${product.name} se vende por debajo del costo`,
          text: `Costo real ${money.format(n.cost)} frente a precio ${money.format(n.sale)}. Pierdes ${money.format(Math.abs(n.gain))} por unidad.`,
        });
      } else if (n.margin < min) {
        const suggested = target < 100 ? n.cost / (1 - target / 100) : n.cost;
        result.push({
          tone: "warning",
          title: `Margen bajo en ${product.name}`,
          text: `Margen actual ${pct(n.margin)}. Para acercarte a ${pct(target)}, el precio orientativo sería ${money.format(suggested)}.`,
        });
      }
    });

    const best = configuredProducts
      .map((product) => ({ product, ...productNumbers(product) }))
      .filter((item) => item.gain > 0)
      .sort((a, b) => b.margin - a.margin)[0];
    if (best) {
      result.push({
        tone: "good",
        title: `Mejor margen actual: ${best.product.name}`,
        text: `Deja ${money.format(best.gain)} por unidad y un margen de ${pct(best.margin)} con los costos configurados.`,
      });
    }

    if (inventory.invested > 0) {
      result.push({
        tone: "info",
        title: `${money.format(inventory.invested)} invertidos en inventario`,
        text: `Si vendieras el stock actual a los precios vigentes, el valor potencial sería ${money.format(inventory.potentialSales)}.`,
      });
    }

    return result.slice(0, 12);
  }, [products, configuredProducts, inventory, money, settings?.economy_target_margin]);

  async function saveSettings(currencyValue: string, targetMargin: number) {
    const { error: settingsError } = await updateEconomySettings(storeId, {
      economy_currency: currencyValue,
      economy_target_margin: targetMargin,
    });
    if (settingsError) {
      window.alert("No se pudo guardar la configuración económica.");
      return;
    }
    setSettings((current) =>
      current
        ? { ...current, economy_currency: currencyValue, economy_target_margin: targetMargin }
        : current
    );
  }

  if (loading) {
    return (
      <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl bg-white shadow-sm">
        <Loader2 className="animate-spin text-blue-700" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-5 rounded-3xl border border-rose-200 bg-white p-8 text-center font-bold text-rose-600 shadow-sm">
        {error}
      </div>
    );
  }

  return (
    <>
      <section className="mt-5 flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["summary", "Resumen"],
            ["products", "Rentabilidad"],
            ["expenses", "Gastos"],
            ["insights", "Recomendaciones"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as typeof tab)}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                tab === value ? "bg-[#061b3a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-500">
            Desde
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Hasta
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" />
          </label>
          {refreshing && <Loader2 className="mb-2 animate-spin text-slate-400" size={18} />}
        </div>
      </section>

      {tab === "summary" && (
        <div className="mt-5 space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Ventas del período" value={money.format(snapshot?.sales || 0)} detail={`${snapshot?.ordersCount || 0} órdenes · ${snapshot?.unitsSold || 0} unidades`} icon={CircleDollarSign} tone="bg-blue-50 text-blue-700" />
            <MetricCard label="Costo vendido estimado" value={money.format(snapshot?.cogs || 0)} detail="Calculado con el costo actual configurado" icon={ArrowDownRight} tone="bg-amber-50 text-amber-700" />
            <MetricCard label="Ganancia bruta" value={money.format(snapshot?.grossProfit || 0)} detail="Ventas de productos menos costo estimado" icon={ArrowUpRight} tone="bg-emerald-50 text-emerald-700" />
            <MetricCard label="Ganancia después de gastos" value={money.format(snapshot?.netProfit || 0)} detail={`${money.format(snapshot?.expenses || 0)} en gastos del período`} icon={WalletCards} tone="bg-violet-50 text-violet-700" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#061b3a]">Inventario valorizado</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-400">Lo que tienes invertido frente a su valor potencial de venta.</p>
                </div>
                <Boxes className="text-blue-700" size={26} />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Capital invertido</p><p className="mt-1 text-xl font-black text-[#061b3a]">{money.format(inventory.invested)}</p></div>
                <div className="rounded-2xl bg-blue-50 p-4"><p className="text-xs font-black uppercase text-blue-500">Venta potencial</p><p className="mt-1 text-xl font-black text-blue-800">{money.format(inventory.potentialSales)}</p></div>
                <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-600">Ganancia potencial</p><p className="mt-1 text-xl font-black text-emerald-800">{money.format(inventory.potentialGain)}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-bold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Margen medio {pct(avgMargin)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{configuredProducts.length}/{products.length} productos con costo</span>
              </div>
            </article>

            <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-[#061b3a]">Configuración</h2>
              <p className="mt-1 text-xs font-semibold text-slate-400">Ajustes financieros de {storeName}.</p>
              <SettingsForm settings={settings} onSave={saveSettings} />
            </article>
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-900">
            <strong>Importante:</strong> en esta Fase 1, el costo de lo vendido usa el costo actual configurado para cada producto. El historial exacto por lote y costo promedio ponderado se conectará en la Fase 2; por eso estas ganancias se muestran como estimadas.
          </section>
        </div>
      )}

      {tab === "products" && (
        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-lg font-black text-[#061b3a]">Rentabilidad por producto</h2><p className="text-sm font-semibold text-slate-400">Edita costo base, costos adicionales y objetivos de margen.</p></div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:w-80"><Search size={17} className="text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto..." className="w-full bg-transparent text-sm font-semibold outline-none" /></label>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1050px] w-full border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-wide text-slate-400"><tr><th className="px-3 py-2">Producto</th><th className="px-3 py-2">Stock</th><th className="px-3 py-2">Costo real</th><th className="px-3 py-2">Venta</th><th className="px-3 py-2">Ganancia/u</th><th className="px-3 py-2">Margen</th><th className="px-3 py-2">ROI</th><th className="px-3 py-2">Invertido</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const n = productNumbers(product);
                  const min = Number(product.financial?.minimum_margin ?? 15);
                  return <tr key={product.id} className="bg-slate-50/80 font-semibold text-slate-700">
                    <td className="rounded-l-2xl px-3 py-3"><div className="flex items-center gap-3">{product.image_url ? <img src={product.image_url} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-200"><Boxes size={16} /></div>}<div><p className="font-black text-[#061b3a]">{product.name}</p><p className="text-xs text-slate-400">{product.category || product.sku || "Sin categoría"}</p></div></div></td>
                    <td className="px-3 py-3 tabular-nums">{product.stock}</td>
                    <td className="px-3 py-3 tabular-nums">{product.financial ? money.format(n.cost) : <span className="text-amber-600">Sin costo</span>}</td>
                    <td className="px-3 py-3 tabular-nums">{money.format(n.sale)}</td>
                    <td className={`px-3 py-3 tabular-nums font-black ${n.gain < 0 ? "text-rose-600" : "text-emerald-700"}`}>{money.format(n.gain)}</td>
                    <td className={`px-3 py-3 tabular-nums font-black ${n.cost > 0 && n.margin < min ? "text-amber-600" : "text-slate-700"}`}>{n.cost > 0 ? pct(n.margin) : "—"}</td>
                    <td className="px-3 py-3 tabular-nums">{n.cost > 0 ? pct(n.roi) : "—"}</td>
                    <td className="px-3 py-3 tabular-nums">{money.format(n.invested)}</td>
                    <td className="rounded-r-2xl px-3 py-3 text-right"><button onClick={() => setEditingProduct(product)} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50"><Pencil size={14} /> Costos</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "expenses" && (
        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#061b3a]">Gastos</h2><p className="text-sm font-semibold text-slate-400">Egresos que reducen la ganancia del negocio.</p></div><button onClick={() => setExpenseOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white"><Plus size={17} /> Registrar gasto</button></div>
          <div className="mt-5 grid gap-3">
            {expenses.map((expense) => <div key={expense.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Receipt size={18} /></span><div><p className="font-black text-[#061b3a]">{expense.category}</p><p className="text-xs font-semibold text-slate-400">{expense.expense_date}{expense.description ? ` · ${expense.description}` : ""}</p></div></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-lg font-black tabular-nums text-rose-600">-{money.format(expense.amount)}</span><button onClick={async () => { if (!window.confirm("¿Eliminar este gasto?")) return; const { error: deleteError } = await deleteEconomyExpense(storeId, expense.id); if (deleteError) window.alert("No se pudo eliminar el gasto."); else void loadData(); }} className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-400 shadow-sm hover:text-rose-600"><Trash2 size={16} /></button></div></div>)}
            {expenses.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">No hay gastos registrados en este período.</div>}
          </div>
        </section>
      )}

      {tab === "insights" && (
        <section className="mt-5 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm md:p-5">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Lightbulb size={20} /></span><div><h2 className="text-lg font-black text-[#061b3a]">Recomendaciones inteligentes</h2><p className="text-sm font-semibold text-slate-400">Reglas financieras explicables; no requieren una API de IA.</p></div></div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">{insights.map((item, index) => { const classes = item.tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-900" : item.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-900" : item.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-blue-200 bg-blue-50 text-blue-900"; return <article key={`${item.title}-${index}`} className={`rounded-2xl border p-4 ${classes}`}><div className="flex gap-3"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><div><p className="font-black">{item.title}</p><p className="mt-1 text-sm font-semibold opacity-80">{item.text}</p></div></div></article>; })}{insights.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">Configura costos para empezar a generar recomendaciones.</div>}</div>
        </section>
      )}

      {editingProduct && <ProductCostModal product={editingProduct} storeId={storeId} currency={currency} onClose={() => setEditingProduct(null)} onSaved={async () => { setEditingProduct(null); await loadData(); }} />}
      {expenseOpen && <ExpenseModal storeId={storeId} onClose={() => setExpenseOpen(false)} onSaved={async () => { setExpenseOpen(false); await loadData(); }} />}
    </>
  );
}

function SettingsForm({ settings, onSave }: { settings: EconomySettings | null; onSave: (currency: string, targetMargin: number) => Promise<void> }) {
  const [currency, setCurrency] = useState(settings?.economy_currency || "USD");
  const [target, setTarget] = useState(String(settings?.economy_target_margin ?? 30));
  const [saving, setSaving] = useState(false);
  return <div className="mt-5 space-y-4"><label className="block text-xs font-black uppercase text-slate-400">Moneda<select value={currency} onChange={(e) => setCurrency(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700"><option value="USD">USD — Dólar</option><option value="CUP">CUP — Peso cubano</option><option value="EUR">EUR — Euro</option></select></label><label className="block text-xs font-black uppercase text-slate-400">Margen objetivo (%)<input type="number" min="0" max="99" step="0.1" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700" /></label><button type="button" disabled={saving} onClick={async () => { setSaving(true); await onSave(currency, Math.min(99, Math.max(0, Number(target || 0)))); setSaving(false); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"><Save size={16} />{saving ? "Guardando..." : "Guardar configuración"}</button></div>;
}

function ProductCostModal({ product, storeId, currency, onClose, onSaved }: { product: EconomyProduct; storeId: string; currency: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [currentCost, setCurrentCost] = useState(String(product.financial?.current_unit_cost ?? ""));
  const [extraCost, setExtraCost] = useState(String(product.financial?.extra_unit_cost ?? ""));
  const [minimumMargin, setMinimumMargin] = useState(String(product.financial?.minimum_margin ?? 15));
  const [targetMargin, setTargetMargin] = useState(String(product.financial?.target_margin ?? 30));
  const [notes, setNotes] = useState(product.financial?.notes || "");
  const [saving, setSaving] = useState(false);
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "CUP" ? 0 : 2 });
  const realCost = Math.max(0, Number(currentCost || 0)) + Math.max(0, Number(extraCost || 0));
  const gain = product.price - realCost;
  const margin = product.price > 0 ? (gain / product.price) * 100 : 0;
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/50 p-4"><div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-blue-600">Costo del producto</p><h3 className="mt-1 text-xl font-black text-[#061b3a]">{product.name}</h3></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-600">Costo de adquisición<input type="number" min="0" step="0.01" value={currentCost} onChange={(e) => setCurrentCost(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-600">Costos adicionales / unidad<input type="number" min="0" step="0.01" value={extraCost} onChange={(e) => setExtraCost(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-600">Margen mínimo (%)<input type="number" min="0" max="99" step="0.1" value={minimumMargin} onChange={(e) => setMinimumMargin(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-600">Margen objetivo (%)<input type="number" min="0" max="99" step="0.1" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><label className="mt-4 block text-sm font-bold text-slate-600">Nota opcional<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Proveedor, condiciones, observaciones..." /></label><div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center"><div><p className="text-xs font-bold text-slate-400">Costo real</p><p className="font-black text-[#061b3a]">{money.format(realCost)}</p></div><div><p className="text-xs font-bold text-slate-400">Ganancia/u</p><p className={`font-black ${gain < 0 ? "text-rose-600" : "text-emerald-700"}`}>{money.format(gain)}</p></div><div><p className="text-xs font-bold text-slate-400">Margen</p><p className="font-black text-[#061b3a]">{realCost > 0 ? pct(margin) : "—"}</p></div></div><button disabled={saving} onClick={async () => { setSaving(true); const { error } = await upsertProductFinancial({ storeId, productId: product.id, currentUnitCost: Number(currentCost || 0), extraUnitCost: Number(extraCost || 0), minimumMargin: Math.min(99, Math.max(0, Number(minimumMargin || 0))), targetMargin: Math.min(99, Math.max(0, Number(targetMargin || 0))), notes }); if (error) { console.error(error); window.alert("No se pudo guardar el costo."); setSaving(false); return; } await onSaved(); setSaving(false); }} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white disabled:opacity-60"><Save size={17} />{saving ? "Guardando..." : "Guardar costo"}</button></div></div>;
}

function ExpenseModal({ storeId, onClose, onSaved }: { storeId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(dateInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: FormEvent) { e.preventDefault(); const numeric = Number(amount || 0); if (numeric <= 0) { window.alert("Escribe un importe mayor que 0."); return; } setSaving(true); const { error } = await createEconomyExpense({ storeId, category, amount: numeric, description, expenseDate, paymentMethod }); if (error) { console.error(error); window.alert("No se pudo registrar el gasto."); setSaving(false); return; } await onSaved(); setSaving(false); }
  return <div className="fixed inset-0 z-[150] grid place-items-center bg-black/50 p-4"><form onSubmit={submit} className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl md:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase text-violet-600">Economía</p><h3 className="mt-1 text-xl font-black text-[#061b3a]">Registrar gasto</h3></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100"><X size={18} /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-600">Categoría<select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5">{EXPENSE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-bold text-slate-600">Importe<input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-600">Fecha<input required type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label className="text-sm font-bold text-slate-600">Forma de pago<input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" placeholder="Efectivo, tarjeta..." /></label></div><label className="mt-4 block text-sm font-bold text-slate-600">Descripción<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><button disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-4 py-3 font-black text-white disabled:opacity-60"><Plus size={17} />{saving ? "Guardando..." : "Registrar gasto"}</button></form></div>;
}
