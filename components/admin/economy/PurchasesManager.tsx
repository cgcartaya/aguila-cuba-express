"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  Truck,
  X,
} from "lucide-react";

import {
  confirmInventoryPurchase,
  createPurchaseDraft,
  deletePurchaseDraft,
  getEconomySuppliers,
  getInventoryPurchases,
  getPurchaseProducts,
  type EconomySupplier,
  type InventoryPurchase,
  type PurchaseProduct,
} from "@/lib/services/economy-purchases";

type DraftItem = {
  productId: string;
  quantity: string;
  unitCost: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function PurchasesManager({
  storeId,
  currency = "USD",
}: {
  storeId: string;
  currency?: string;
}) {
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [suppliers, setSuppliers] = useState<EconomySupplier[]>([]);
  const [products, setProducts] = useState<PurchaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(today());
  const [reference, setReference] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [customsCost, setCustomsCost] = useState("");
  const [otherCosts, setOtherCosts] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { productId: "", quantity: "1", unitCost: "" },
  ]);

  const money = useMemo(
    () =>
      new Intl.NumberFormat(currency === "CUP" ? "es-CU" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "CUP" ? 0 : 2,
      }),
    [currency]
  );

  async function load() {
    setLoading(true);
    try {
      const [purchaseRows, supplierRows, productRows] = await Promise.all([
        getInventoryPurchases(storeId),
        getEconomySuppliers(storeId),
        getPurchaseProducts(storeId),
      ]);

      setPurchases(purchaseRows);
      setSuppliers(supplierRows);
      setProducts(productRows);
    } catch (error) {
      console.error(error);
      window.alert("No se pudieron cargar las compras.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const merchandise = items.reduce(
    (sum, item) =>
      sum +
      Math.max(0, Number(item.quantity || 0)) *
        Math.max(0, Number(item.unitCost || 0)),
    0
  );

  const extras =
    Math.max(0, Number(shippingCost || 0)) +
    Math.max(0, Number(customsCost || 0)) +
    Math.max(0, Number(otherCosts || 0));

  const confirmedInvestment = purchases
    .filter((purchase) => purchase.status === "confirmed")
    .reduce((sum, purchase) => sum + purchase.total_amount, 0);

  const drafts = purchases.filter(
    (purchase) => purchase.status === "draft"
  ).length;

  const validLines = items.filter(
    (item) => item.productId && Number(item.quantity) > 0
  );

  const totalUnits = validLines.reduce(
    (sum, item) => sum + Math.max(0, Number(item.quantity || 0)),
    0
  );

  function reset() {
    setSupplierId("");
    setPurchaseDate(today());
    setReference("");
    setShippingCost("");
    setCustomsCost("");
    setOtherCosts("");
    setNotes("");
    setItems([{ productId: "", quantity: "1", unitCost: "" }]);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function getProduct(productId: string) {
    return products.find((product) => product.id === productId);
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();

    const valid = items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.trunc(Number(item.quantity)),
        unitCost: Math.max(0, Number(item.unitCost || 0)),
      }));

    if (!valid.length) {
      window.alert("Agrega al menos un producto válido.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await createPurchaseDraft(storeId, {
        supplierId: supplierId || null,
        purchaseDate,
        reference,
        shippingCost: Number(shippingCost || 0),
        customsCost: Number(customsCost || 0),
        otherCosts: Number(otherCosts || 0),
        notes,
        items: valid,
      });

      if (error) throw error;

      setOpen(false);
      reset();
      await load();
    } catch (error: any) {
      console.error(error);
      window.alert(error?.message || "No se pudo guardar el borrador.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmPurchase(purchase: InventoryPurchase) {
    if (
      !window.confirm(
        "Confirmar aumentará el inventario y recalculará el costo promedio. ¿Continuar?"
      )
    ) {
      return;
    }

    setConfirming(purchase.id);

    try {
      const { error } = await confirmInventoryPurchase(purchase.id);
      if (error) throw error;

      await load();
      window.alert("Compra confirmada. Inventario y costos actualizados.");
    } catch (error: any) {
      window.alert(error?.message || "No se pudo confirmar la compra.");
    } finally {
      setConfirming(null);
    }
  }

  async function removeDraft(id: string) {
    if (!window.confirm("¿Eliminar este borrador?")) return;

    const { error } = await deletePurchaseDraft(storeId, id);

    if (error) {
      window.alert(error.message);
      return;
    }

    await load();
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white">
        <Loader2 className="animate-spin text-blue-700" size={30} />
      </div>
    );
  }

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Compras registradas
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {purchases.length}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-amber-600">
            Borradores
          </p>
          <p className="mt-2 text-3xl font-black text-amber-900">{drafts}</p>
          <p className="mt-1 text-sm text-amber-700">
            No afectan inventario
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
            Inversión confirmada
          </p>
          <p className="mt-2 text-3xl font-black text-emerald-900">
            {money.format(confirmedInvestment)}
          </p>
        </div>
      </section>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0a2b55]"
        >
          <Plus size={18} />
          Nueva compra
        </button>
      </div>

      <section className="mt-5 space-y-4">
        {purchases.map((purchase) => {
          const rows = purchase.inventory_purchase_items || [];

          return (
            <article
              key={purchase.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-[#061b3a]">
                      {purchase.economy_suppliers?.name || "Sin proveedor"}
                    </h3>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        purchase.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {purchase.status === "confirmed"
                        ? "Confirmada"
                        : "Borrador"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {purchase.purchase_date}
                    {purchase.reference
                      ? ` · Ref. ${purchase.reference}`
                      : ""}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {rows.map((item) => (
                      <span
                        key={item.id}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        {item.quantity}× {item.products?.name || "Producto"}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="min-w-[220px] rounded-2xl bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span>Mercancía</span>
                    <strong>{money.format(purchase.merchandise_total)}</strong>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span>Gastos</span>
                    <strong>
                      {money.format(
                        purchase.shipping_cost +
                          purchase.customs_cost +
                          purchase.other_costs
                      )}
                    </strong>
                  </div>

                  <div className="mt-3 flex justify-between border-t border-slate-200 pt-3">
                    <span className="font-black">Total</span>
                    <strong className="text-lg">
                      {money.format(purchase.total_amount)}
                    </strong>
                  </div>
                </div>
              </div>

              {purchase.status === "confirmed" &&
                rows.some((item) => item.new_average_cost > 0) && (
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {rows.map((item) => {
                      const change =
                        item.previous_average_cost > 0
                          ? ((item.new_average_cost -
                              item.previous_average_cost) /
                              item.previous_average_cost) *
                            100
                          : 0;

                      return (
                        <div
                          key={`${item.id}-cost`}
                          className="rounded-2xl border border-slate-100 p-3"
                        >
                          <p className="truncate text-xs font-black text-slate-600">
                            {item.products?.name}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Costo puesto:{" "}
                            <strong>
                              {money.format(item.landed_unit_cost)}
                            </strong>
                          </p>

                          <p className="text-sm text-slate-500">
                            Promedio nuevo:{" "}
                            <strong>
                              {money.format(item.new_average_cost)}
                            </strong>

                            {item.previous_average_cost > 0 && (
                              <span
                                className={
                                  change > 0
                                    ? "ml-2 text-rose-600"
                                    : "ml-2 text-emerald-600"
                                }
                              >
                                {change > 0 ? "+" : ""}
                                {change.toFixed(1)}%
                              </span>
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

              {purchase.status === "draft" && (
                <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => removeDraft(purchase.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-black text-rose-700"
                  >
                    <Trash2 size={16} />
                    Eliminar
                  </button>

                  <button
                    type="button"
                    disabled={confirming === purchase.id}
                    onClick={() => confirmPurchase(purchase)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    {confirming === purchase.id ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Confirmar compra
                  </button>
                </div>
              )}
            </article>
          );
        })}

        {!purchases.length && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <ClipboardList className="mx-auto text-slate-300" size={38} />
            <h3 className="mt-3 font-black text-slate-700">
              Todavía no hay compras
            </h3>
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-2 md:p-5">
          <div className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-7">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                  <PackagePlus size={22} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                    Entrada de mercancía
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">
                    Nueva compra
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveDraft}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 md:px-7">
                <section className="grid gap-4 md:grid-cols-3">
                  <label className="text-sm font-bold text-slate-700">
                    Proveedor
                    <select
                      value={supplierId}
                      onChange={(event) =>
                        setSupplierId(event.target.value)
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="">Sin proveedor</option>

                      {suppliers
                        .filter((supplier) => supplier.is_active)
                        .map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Fecha
                    <input
                      type="date"
                      required
                      value={purchaseDate}
                      onChange={(event) =>
                        setPurchaseDate(event.target.value)
                      }
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Referencia{" "}
                    <span className="font-medium text-slate-400">
                      (opcional)
                    </span>
                    <input
                      value={reference}
                      onChange={(event) =>
                        setReference(event.target.value)
                      }
                      placeholder="Ej. Factura, guía, orden de compra..."
                      className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </label>
                </section>

                <section className="mt-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        Productos
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Cantidad y costo unitario por cada producto de la compra.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) => [
                          ...current,
                          {
                            productId: "",
                            quantity: "1",
                            unitCost: "",
                          },
                        ])
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                    >
                      <Plus size={16} />
                      Agregar producto
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="hidden grid-cols-[minmax(0,1.8fr)_120px_160px_140px_54px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-500 lg:grid">
                      <span>Producto</span>
                      <span>Cantidad</span>
                      <span>Costo unitario</span>
                      <span>Subtotal</span>
                      <span className="text-center">Acción</span>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {items.map((item, index) => {
                        const product = getProduct(item.productId);
                        const quantity = Math.max(
                          0,
                          Number(item.quantity || 0)
                        );
                        const unitCost = Math.max(
                          0,
                          Number(item.unitCost || 0)
                        );
                        const subtotal = quantity * unitCost;

                        return (
                          <div
                            key={index}
                            className="grid gap-3 bg-white p-4 lg:grid-cols-[minmax(0,1.8fr)_120px_160px_140px_54px] lg:items-center"
                          >
                            <div className="min-w-0">
                              <label className="mb-1 block text-xs font-black uppercase text-slate-400 lg:hidden">
                                Producto
                              </label>

                              <select
                                required
                                value={item.productId}
                                onChange={(event) =>
                                  updateItem(index, {
                                    productId: event.target.value,
                                  })
                                }
                                className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                              >
                                <option value="">
                                  Selecciona un producto
                                </option>

                                {products.map((productOption) => (
                                  <option
                                    key={productOption.id}
                                    value={productOption.id}
                                  >
                                    {productOption.name} · stock{" "}
                                    {productOption.stock}
                                  </option>
                                ))}
                              </select>

                              {product && (
                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                  {product.sku && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-600">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                                    Stock actual: {product.stock}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-slate-400 lg:hidden">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(index, {
                                    quantity: event.target.value,
                                  })
                                }
                                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-slate-400 lg:hidden">
                                Costo unitario
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  required
                                  value={item.unitCost}
                                  onChange={(event) =>
                                    updateItem(index, {
                                      unitCost: event.target.value,
                                    })
                                  }
                                  placeholder="0.00"
                                  className="h-12 w-full rounded-xl border border-slate-200 px-3 pr-14 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  {currency}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-black uppercase text-slate-400 lg:hidden">
                                Subtotal
                              </label>
                              <div className="flex h-12 items-center rounded-xl bg-slate-50 px-3 text-base font-black tabular-nums text-slate-900 lg:bg-transparent lg:px-0">
                                {money.format(subtotal)}
                              </div>
                            </div>

                            <div className="flex justify-end lg:justify-center">
                              <button
                                type="button"
                                disabled={items.length === 1}
                                onClick={() =>
                                  setItems((current) =>
                                    current.filter(
                                      (_, itemIndex) =>
                                        itemIndex !== index
                                    )
                                  )
                                }
                                className="grid h-11 w-11 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-30"
                                aria-label="Eliminar producto"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-700 shadow-sm">
                        <Truck size={18} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">
                          Gastos asociados
                        </h3>
                        <p className="text-xs text-slate-500">
                          Se reparten proporcionalmente por el valor de cada línea.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {[
                      ["Transporte", shippingCost, setShippingCost],
                      ["Aduana", customsCost, setCustomsCost],
                      ["Otros", otherCosts, setOtherCosts],
                    ].map(([label, value, setter]) => (
                      <label
                        key={String(label)}
                        className="text-sm font-bold text-slate-700"
                      >
                        {String(label)}
                        <div className="relative mt-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={String(value)}
                            onChange={(event) =>
                              (setter as (value: string) => void)(
                                event.target.value
                              )
                            }
                            placeholder="0.00"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pr-14 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            {currency}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <label className="mt-6 block text-sm font-bold text-slate-700">
                  Notas{" "}
                  <span className="font-medium text-slate-400">
                    (opcional)
                  </span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Observaciones, condiciones, detalles adicionales..."
                    className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </label>

                <section className="mt-6 grid gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-3">
                  <div className="p-4 md:border-r md:border-slate-200">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Total mercancía
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                      {money.format(merchandise)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {validLines.length}{" "}
                      {validLines.length === 1 ? "línea" : "líneas"} ·{" "}
                      {totalUnits} unidades
                    </p>
                  </div>

                  <div className="border-t border-slate-200 p-4 md:border-r md:border-t-0">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Total gastos
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">
                      {money.format(extras)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Transporte {money.format(Number(shippingCost || 0))} ·
                      Aduana {money.format(Number(customsCost || 0))}
                    </p>
                  </div>

                  <div className="border-t border-slate-200 p-4 md:border-t-0">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">
                      Total inversión
                    </p>
                    <p className="mt-1 text-2xl font-black tabular-nums text-emerald-700">
                      {money.format(merchandise + extras)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Mercancía + gastos
                    </p>
                  </div>
                </section>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  <AlertTriangle
                    size={18}
                    className="mr-2 inline-block align-text-bottom"
                  />
                  <strong>Guardar borrador no cambia inventario.</strong>{" "}
                  El stock y el costo promedio solo cambian cuando confirmas la compra desde el listado.
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 md:px-7">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={closeModal}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#0a2b55] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <PackagePlus size={17} />
                    )}
                    Guardar borrador
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
