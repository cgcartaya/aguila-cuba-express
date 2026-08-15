"use client";

/* =========================================================
   ADMIN - ZONAS DE ENTREGA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";

import {
  bulkDeleteDeliveryZones,
  bulkSetDeliveryZonesActive,
  bulkUpdateDeliveryZoneValues,
  createDeliveryZone,
  deleteDeliveryZone,
  getDeliveryZones,
  updateDeliveryZone,
  type DeliveryZone,
} from "@/lib/services/settings";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

const MUNICIPALITIES = [
  "Cienfuegos",
  "Aguada de Pasajeros",
  "Rodas",
  "Palmira",
  "Lajas",
  "Cruces",
  "Cumanayagua",
  "Abreus",
];

type BulkField = "delivery_fee" | "minimum_order" | "free_delivery_from";
type BulkMode = "set" | "amount" | "percent";

const BULK_FIELD_LABELS: Record<BulkField, string> = {
  delivery_fee: "Costo de domicilio",
  minimum_order: "Compra mínima",
  free_delivery_from: "Domicilio gratis desde",
};

const emptyForm = {
  municipality: "Cienfuegos",
  zone_name: "",
  delivery_fee: "0",
  minimum_order: "0",
  free_delivery_from: "0",
  is_active: true,
  sort_order: "0",
};

export default function AdminDeliveryZonesPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [municipalityFilter, setMunicipalityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Municipios expandidos/colapsados (colapsados por defecto para evitar
  // scroll interminable con muchas zonas)
  const [expandedMunicipios, setExpandedMunicipios] = useState<Set<string>>(
    new Set()
  );

  // Selección múltiple + edición en lote
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<BulkField | null>(null);
  const [bulkMode, setBulkMode] = useState<BulkMode>("set");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");

  // Edición rápida (tocar el valor directo en la tarjeta)
  const [inlineSavingId, setInlineSavingId] = useState<string | null>(null);

  const isFiltering =
    searchQuery.trim() !== "" ||
    municipalityFilter !== "all" ||
    statusFilter !== "all";

  const filteredZones = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return zones.filter((zone) => {
      if (municipalityFilter !== "all" && zone.municipality !== municipalityFilter) {
        return false;
      }

      if (statusFilter === "active" && !zone.is_active) return false;
      if (statusFilter === "inactive" && zone.is_active) return false;

      if (q) {
        const haystack = `${zone.zone_name} ${zone.municipality}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [zones, searchQuery, municipalityFilter, statusFilter]);

  const groupedZones = useMemo(() => {
    return filteredZones.reduce<Record<string, DeliveryZone[]>>((acc, zone) => {
      if (!acc[zone.municipality]) acc[zone.municipality] = [];
      acc[zone.municipality].push(zone);
      return acc;
    }, {});
  }, [filteredZones]);

  const municipalityOptions = useMemo(() => {
    return Array.from(new Set(zones.map((zone) => zone.municipality))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [zones]);

  useEffect(() => {
    loadZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function loadZones() {
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setZones([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data, error } = await getDeliveryZones(activeStore.id);

      if (error) throw error;

      setZones(data || []);
    } catch (err: any) {
      console.error("ERROR CARGANDO ZONAS:", err);
      setError(err?.message || "No se pudieron cargar las zonas de entrega.");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const target = e.target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setForm((current) => ({
        ...current,
        [target.name]: target.checked,
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [target.name]: target.value,
    }));
  }

  function handleEdit(zone: DeliveryZone) {
    setEditingId(zone.id);

    setForm({
      municipality: zone.municipality,
      zone_name: zone.zone_name,
      delivery_fee: String(zone.delivery_fee ?? 0),
      minimum_order: String(zone.minimum_order ?? 0),
      free_delivery_from: String(zone.free_delivery_from ?? 0),
      is_active: Boolean(zone.is_active),
      sort_order: String(zone.sort_order ?? 0),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.zone_name.trim()) {
      setError("Escribe el nombre de la zona.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        municipality: form.municipality,
        zone_name: form.zone_name.trim(),
        delivery_fee: Number(form.delivery_fee || 0),
        minimum_order: Number(form.minimum_order || 0),
        free_delivery_from: Number(form.free_delivery_from || 0),
        is_active: form.is_active,
        sort_order: Number(form.sort_order || 0),
      };

      if (!activeStore?.id) {
        throw new Error("No se encontró la tienda activa.");
      }

      const { error } = editingId
        ? await updateDeliveryZone(editingId, payload, activeStore.id)
        : await createDeliveryZone(payload, activeStore.id);

      if (error) throw error;

      setSuccess(
        editingId
          ? "Zona actualizada correctamente."
          : "Zona creada correctamente."
      );

      resetForm();
      await loadZones();
    } catch (err: any) {
      console.error("ERROR GUARDANDO ZONA:", err);
      setError(err?.message || "No se pudo guardar la zona.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "¿Seguro que quieres eliminar esta zona? Si ya existen órdenes asociadas, es mejor desactivarla en vez de eliminarla."
    );

    if (!confirmDelete) return;

    try {
      setError("");
      setSuccess("");

      if (!activeStore?.id) {
        throw new Error("No se encontró la tienda activa.");
      }

      const { error } = await deleteDeliveryZone(id, activeStore.id);

      if (error) throw error;

      setSuccess("Zona eliminada correctamente.");
      await loadZones();
    } catch (err: any) {
      console.error("ERROR ELIMINANDO ZONA:", err);
      setError(err?.message || "No se pudo eliminar la zona.");
    }
  }

  /* =========================================================
     BÚSQUEDA / FILTROS / EXPANDIR-COLAPSAR
  ========================================================= */

  function toggleMunicipioExpanded(municipality: string) {
    setExpandedMunicipios((current) => {
      const next = new Set(current);
      if (next.has(municipality)) next.delete(municipality);
      else next.add(municipality);
      return next;
    });
  }

  function expandAll() {
    setExpandedMunicipios(new Set(Object.keys(groupedZones)));
  }

  function collapseAll() {
    setExpandedMunicipios(new Set());
  }

  /* =========================================================
     SELECCIÓN MÚLTIPLE
  ========================================================= */

  function toggleZoneSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroupSelection(groupZones: DeliveryZone[]) {
    setSelectedIds((current) => {
      const next = new Set(current);
      const allSelected = groupZones.every((zone) => next.has(zone.id));
      groupZones.forEach((zone) => {
        if (allSelected) next.delete(zone.id);
        else next.add(zone.id);
      });
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      const allSelected =
        filteredZones.length > 0 &&
        filteredZones.every((zone) => current.has(zone.id));

      if (allSelected) return new Set();
      return new Set(filteredZones.map((zone) => zone.id));
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkField(null);
    setBulkValue("");
    setBulkError("");
    setBulkSuccess("");
  }

  /* =========================================================
     EDICIÓN RÁPIDA (tocar el valor en la tarjeta)
  ========================================================= */

  async function handleInlineFieldSave(
    id: string,
    field: BulkField,
    value: number
  ) {
    if (!activeStore?.id) return;

    setInlineSavingId(id);

    try {
      const { error } = await updateDeliveryZone(
        id,
        { [field]: value } as Partial<DeliveryZone>,
        activeStore.id
      );

      if (error) throw error;

      setZones((current) =>
        current.map((zone) =>
          zone.id === id ? { ...zone, [field]: value } : zone
        )
      );
    } catch (err: any) {
      console.error("ERROR EDITANDO CAMPO EN LÍNEA:", err);
      setError(err?.message || "No se pudo actualizar el valor.");
    } finally {
      setInlineSavingId(null);
    }
  }

  /* =========================================================
     EDICIÓN EN LOTE
  ========================================================= */

  function computeBulkPatchValue(
    current: number,
    mode: BulkMode,
    rawValue: number
  ) {
    if (mode === "set") return Math.max(0, rawValue);

    if (mode === "percent") {
      return Math.max(0, Number((current * (1 + rawValue / 100)).toFixed(2)));
    }

    // amount: sumar o restar (usar valor negativo para restar)
    return Math.max(0, Number((current + rawValue).toFixed(2)));
  }

  async function handleApplyBulkField() {
    if (!bulkField) return;

    if (bulkValue.trim() === "" || Number.isNaN(Number(bulkValue))) {
      setBulkError("Escribe un valor válido.");
      return;
    }

    if (!activeStore?.id) {
      setBulkError("No se encontró la tienda activa.");
      return;
    }

    const rawValue = Number(bulkValue);
    const targets = zones.filter((zone) => selectedIds.has(zone.id));

    const updates = targets.map((zone) => ({
      id: zone.id,
      patch: {
        [bulkField]: computeBulkPatchValue(
          Number(zone[bulkField] || 0),
          bulkMode,
          rawValue
        ),
      } as Partial<DeliveryZone>,
    }));

    try {
      setBulkSaving(true);
      setBulkError("");
      setBulkSuccess("");

      const { error } = await bulkUpdateDeliveryZoneValues(
        updates,
        activeStore.id
      );

      if (error) throw error;

      setBulkSuccess(
        `${BULK_FIELD_LABELS[bulkField]} actualizado en ${targets.length} zona(s).`
      );
      setBulkField(null);
      setBulkValue("");
      await loadZones();
    } catch (err: any) {
      console.error("ERROR EN EDICIÓN EN LOTE:", err);
      setBulkError(err?.message || "No se pudo aplicar el cambio en lote.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkSetActive(isActive: boolean) {
    if (!activeStore?.id || selectedIds.size === 0) return;

    try {
      setBulkSaving(true);
      setBulkError("");
      setBulkSuccess("");

      const { error } = await bulkSetDeliveryZonesActive(
        Array.from(selectedIds),
        isActive,
        activeStore.id
      );

      if (error) throw error;

      setBulkSuccess(
        isActive
          ? `${selectedIds.size} zona(s) activada(s).`
          : `${selectedIds.size} zona(s) desactivada(s).`
      );

      await loadZones();
    } catch (err: any) {
      console.error("ERROR ACTIVANDO/DESACTIVANDO EN LOTE:", err);
      setBulkError(err?.message || "No se pudo actualizar el estado en lote.");
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleBulkDelete() {
    if (!activeStore?.id || selectedIds.size === 0) return;

    const confirmDelete = window.confirm(
      `¿Seguro que quieres eliminar ${selectedIds.size} zona(s)? Si ya existen órdenes asociadas, es mejor desactivarlas en vez de eliminarlas.`
    );

    if (!confirmDelete) return;

    try {
      setBulkSaving(true);
      setBulkError("");
      setBulkSuccess("");

      const { error } = await bulkDeleteDeliveryZones(
        Array.from(selectedIds),
        activeStore.id
      );

      if (error) throw error;

      setBulkSuccess(`${selectedIds.size} zona(s) eliminada(s).`);
      clearSelection();
      await loadZones();
    } catch (err: any) {
      console.error("ERROR ELIMINANDO EN LOTE:", err);
      setBulkError(err?.message || "No se pudo eliminar en lote.");
    } finally {
      setBulkSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-7xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Zonas de entrega"
          description="Define municipios, zonas, costos y reglas reales de domicilio para el checkout."
          badge="Domicilio inteligente"
          icon={MapPinned}
        />

        <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-[#0B1F4D]">
              {editingId ? (
                <>
                  <Pencil size={20} />
                  Editar zona
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Nueva zona
                </>
              )}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-[#0B1F4D]">
                  Municipio
                </label>

                <select
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {MUNICIPALITIES.map((municipality) => (
                    <option key={municipality} value={municipality}>
                      {municipality}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Nombre de la zona"
                name="zone_name"
                value={form.zone_name}
                onChange={handleChange}
                placeholder="Ej: Punta Gorda, Centro, Junco Sur..."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Costo domicilio"
                  name="delivery_fee"
                  type="number"
                  value={form.delivery_fee}
                  onChange={handleChange}
                />

                <Input
                  label="Compra mínima"
                  name="minimum_order"
                  type="number"
                  value={form.minimum_order}
                  onChange={handleChange}
                />
              </div>

              <Input
                label="Domicilio gratis desde"
                name="free_delivery_from"
                type="number"
                value={form.free_delivery_from}
                onChange={handleChange}
              />

              <Input
                label="Orden visual"
                name="sort_order"
                type="number"
                value={form.sort_order}
                onChange={handleChange}
              />

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-blue-50/40 px-4 py-3 text-sm font-semibold text-[#0B1F4D]">
                <input
                  name="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Zona activa en checkout
              </label>
            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <AdminButton
                type="submit"
                disabled={saving}
                icon={saving ? Loader2 : Save}
                className="flex-1"
              >
                {saving
                  ? "Guardando..."
                  : editingId
                    ? "Guardar cambios"
                    : "Crear zona"}
              </AdminButton>

              {editingId && (
                <AdminButton
                  type="button"
                  onClick={resetForm}
                  variant="secondary"
                >
                  Cancelar
                </AdminButton>
              )}
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0B1F4D]">
                  Zonas configuradas
                </h2>

                <p className="text-sm text-slate-500">
                  Estas son las zonas que aparecerán en el checkout público.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                {filteredZones.length === zones.length
                  ? `${zones.length} zonas`
                  : `${filteredZones.length} de ${zones.length} zonas`}
              </span>
            </div>

            {/* Buscador y filtros */}
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar zona o municipio..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <select
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">Todos los municipios</option>
                {municipalityOptions.map((municipality) => (
                  <option key={municipality} value={municipality}>
                    {municipality}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
                className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="all">Todas</option>
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
              </select>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={
                    filteredZones.length > 0 &&
                    filteredZones.every((zone) => selectedIds.has(zone.id))
                  }
                  onChange={toggleSelectAllVisible}
                  className="h-4 w-4"
                />
                Seleccionar visibles
              </label>

              <button
                type="button"
                onClick={expandAll}
                className="hover:text-blue-700"
              >
                Expandir todo
              </button>

              <span className="text-slate-300">·</span>

              <button
                type="button"
                onClick={collapseAll}
                className="hover:text-blue-700"
              >
                Colapsar todo
              </button>
            </div>

            {/* Barra de edición en lote */}
            {selectedIds.size > 0 && (
              <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0B1F4D]">
                    <ListChecks size={18} className="text-blue-600" />
                    {selectedIds.size} zona{selectedIds.size === 1 ? "" : "s"}{" "}
                    seleccionada{selectedIds.size === 1 ? "" : "s"}
                  </div>

                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancelar selección
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <BulkFieldButton
                    label="Costo domicilio"
                    active={bulkField === "delivery_fee"}
                    onClick={() => {
                      setBulkField("delivery_fee");
                      setBulkMode("set");
                      setBulkValue("");
                      setBulkError("");
                    }}
                  />

                  <BulkFieldButton
                    label="Compra mínima"
                    active={bulkField === "minimum_order"}
                    onClick={() => {
                      setBulkField("minimum_order");
                      setBulkMode("set");
                      setBulkValue("");
                      setBulkError("");
                    }}
                  />

                  <BulkFieldButton
                    label="Gratis desde"
                    active={bulkField === "free_delivery_from"}
                    onClick={() => {
                      setBulkField("free_delivery_from");
                      setBulkMode("set");
                      setBulkValue("");
                      setBulkError("");
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleBulkSetActive(true)}
                    disabled={bulkSaving}
                    className="rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-50 disabled:opacity-50"
                  >
                    Activar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBulkSetActive(false)}
                    disabled={bulkSaving}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Desactivar
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkSaving}
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>

                {bulkField && (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
                    <p className="mb-2 text-sm font-bold text-[#0B1F4D]">
                      {BULK_FIELD_LABELS[bulkField]} — {selectedIds.size} zona(s)
                    </p>

                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-500">
                          Modo
                        </label>

                        <select
                          value={bulkMode}
                          onChange={(e) =>
                            setBulkMode(e.target.value as BulkMode)
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        >
                          <option value="set">Fijar valor exacto</option>
                          <option value="amount">Sumar / restar monto</option>
                          <option value="percent">Aplicar %</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-500">
                          {bulkMode === "set"
                            ? "Nuevo valor ($)"
                            : bulkMode === "percent"
                              ? "% (usa negativo para bajar)"
                              : "Monto (usa negativo para restar)"}
                        </label>

                        <input
                          type="number"
                          step="0.01"
                          value={bulkValue}
                          onChange={(e) => setBulkValue(e.target.value)}
                          placeholder={
                            bulkMode === "percent" ? "Ej: 10 ó -10" : "Ej: 5 ó -5"
                          }
                          className="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyBulkField}
                        disabled={bulkSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {bulkSaving ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Aplicar
                      </button>

                      <button
                        type="button"
                        onClick={() => setBulkField(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {bulkError && (
                  <div className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs font-medium text-red-600">
                    {bulkError}
                  </div>
                )}

                {bulkSuccess && (
                  <div className="mt-3 rounded-xl bg-green-50 px-4 py-2 text-xs font-medium text-green-700">
                    {bulkSuccess}
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 p-10 text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                Cargando zonas...
              </div>
            ) : zones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <MapPinned className="mx-auto mb-3 text-slate-400" size={36} />
                <h3 className="font-bold text-[#0B1F4D]">
                  Todavía no hay zonas
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Crea la primera zona para activar el checkout por ubicación.
                </p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                <Search className="mx-auto mb-3 text-slate-400" size={36} />
                <h3 className="font-bold text-[#0B1F4D]">
                  No hay zonas que coincidan
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Prueba con otro término de búsqueda o quita los filtros.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedZones).map(([municipality, items]) => {
                  const isExpanded =
                    isFiltering || expandedMunicipios.has(municipality);
                  const allGroupSelected = items.every((zone) =>
                    selectedIds.has(zone.id)
                  );

                  return (
                    <div key={municipality}>
                      <div className="mb-3 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-2">
                        <input
                          type="checkbox"
                          checked={allGroupSelected}
                          onChange={() => toggleGroupSelection(items)}
                          className="h-4 w-4"
                        />

                        <button
                          type="button"
                          onClick={() => toggleMunicipioExpanded(municipality)}
                          className="flex flex-1 items-center justify-between text-sm font-black uppercase tracking-wide text-blue-700"
                        >
                          <span>
                            {municipality}{" "}
                            <span className="ml-1 font-bold normal-case text-blue-500">
                              ({items.length})
                            </span>
                          </span>

                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mb-3 space-y-3">
                          {items.map((zone) => (
                            <article
                              key={zone.id}
                              className={`rounded-2xl border p-4 transition ${
                                selectedIds.has(zone.id)
                                  ? "border-blue-400 bg-blue-50/40"
                                  : "border-slate-200 hover:border-blue-200 hover:bg-blue-50/20"
                              }`}
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(zone.id)}
                                    onChange={() => toggleZoneSelection(zone.id)}
                                    className="mt-1.5 h-4 w-4 flex-shrink-0"
                                  />

                                  <div>
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                      <h4 className="text-lg font-bold text-[#0B1F4D]">
                                        {zone.zone_name}
                                      </h4>

                                      <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                                          zone.is_active
                                            ? "bg-green-100 text-green-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {zone.is_active ? "Activa" : "Inactiva"}
                                      </span>

                                      {inlineSavingId === zone.id && (
                                        <Loader2
                                          size={14}
                                          className="animate-spin text-blue-500"
                                        />
                                      )}
                                    </div>

                                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                                      <InlineStat
                                        label="Domicilio"
                                        value={Number(zone.delivery_fee || 0)}
                                        saving={inlineSavingId === zone.id}
                                        onSave={(value) =>
                                          handleInlineFieldSave(
                                            zone.id,
                                            "delivery_fee",
                                            value
                                          )
                                        }
                                      />

                                      <InlineStat
                                        label="Mínimo"
                                        value={Number(zone.minimum_order || 0)}
                                        saving={inlineSavingId === zone.id}
                                        onSave={(value) =>
                                          handleInlineFieldSave(
                                            zone.id,
                                            "minimum_order",
                                            value
                                          )
                                        }
                                      />

                                      <InlineStat
                                        label="Gratis desde"
                                        value={Number(
                                          zone.free_delivery_from || 0
                                        )}
                                        saving={inlineSavingId === zone.id}
                                        onSave={(value) =>
                                          handleInlineFieldSave(
                                            zone.id,
                                            "free_delivery_from",
                                            value
                                          )
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(zone)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-[#0B1F4D] hover:bg-blue-50"
                                  >
                                    <Pencil size={15} />
                                    Editar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(zone.id)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 size={15} />
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-bold text-[#0B1F4D]">
        {label}
      </label>

      <input
        name={name}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function BulkFieldButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-[#0B1F4D] hover:bg-blue-50"
      }`}
    >
      {label}
    </button>
  );
}

function InlineStat({
  label,
  value,
  onSave,
  saving,
}: {
  label: string;
  value: number;
  onSave: (newValue: number) => void | Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  async function commit() {
    const parsed = Number(draft);
    setEditing(false);

    if (Number.isNaN(parsed) || parsed === value) {
      setDraft(String(value));
      return;
    }

    await onSave(parsed);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {label}:{" "}
        <input
          autoFocus
          type="number"
          step="0.01"
          min="0"
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(String(value));
              setEditing(false);
            }
          }}
          onBlur={commit}
          className="w-20 rounded-lg border border-blue-300 px-2 py-0.5 text-[#0B1F4D] outline-none focus:ring-2 focus:ring-blue-200"
        />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title="Tocar para editar"
      className="group -mx-1 inline-flex items-center gap-1 rounded-lg px-1 hover:bg-blue-50"
    >
      {label}:{" "}
      <strong className="text-[#0B1F4D] underline decoration-dotted decoration-slate-300 group-hover:decoration-blue-400">
        ${value.toFixed(2)}
      </strong>
      <Pencil
        size={11}
        className="text-slate-300 opacity-0 group-hover:opacity-100"
      />
    </button>
  );
}
