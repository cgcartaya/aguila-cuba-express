"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDollarSign,
  DollarSign,
  Edit3,
  Globe2,
  Loader2,
  MapPinned,
  PackageCheck,
  PackageOpen,
  Plus,
  Power,
  PowerOff,
  Save,
  Send,
  Settings2,
  Tags,
  Trash2,
  WalletCards,
  Warehouse,
  X,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  createCountry,
  createExtraFee,
  createLocation,
  createMunicipality,
  createProvince,
  createServiceType,
  deleteShippingConfigItem,
  deleteShippingRate,
  getShippingConfiguration,
  setShippingConfigItemActive,
  updateActiveShipmentsStatusBulk,
  updateExtraFee,
  upsertShippingRate,
  upsertShippingRatesBulk,
  upsertShippingSettings,
} from "@/lib/services/shipping-settings";
import type {
  ShippingCountry,
  ShippingExtraFee,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingRate,
  ShippingServiceType,
  ShippingSettings,
} from "@/lib/shipping/types";

export default function ShippingSettingsPage() {
  const {
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [countries, setCountries] = useState<ShippingCountry[]>([]);
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>(
    [],
  );
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ShippingServiceType[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [extraFees, setExtraFees] = useState<ShippingExtraFee[]>([]);

  const [selectedCountryId, setSelectedCountryId] = useState("");
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState("");

  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [provinceName, setProvinceName] = useState("");
  const [provinceCode, setProvinceCode] = useState("");
  const [municipalityName, setMunicipalityName] = useState("");
  const [municipalityCode, setMunicipalityCode] = useState("");
  const [locationName, setLocationName] = useState("");
  const [legacyCode, setLegacyCode] = useState("");

  const [serviceName, setServiceName] = useState("");
  const [serviceCode, setServiceCode] = useState("");
  const [legacyPrefix, setLegacyPrefix] = useState("");
  const [billingMode, setBillingMode] = useState<
    "per_lb" | "fixed" | "percentage"
  >("per_lb");

  const [rateScope, setRateScope] = useState<
    "country" | "province" | "municipality" | "location"
  >("province");
  const [selectedRateCountryIds, setSelectedRateCountryIds] = useState<
    string[]
  >([]);
  const [selectedRateProvinceIds, setSelectedRateProvinceIds] = useState<
    string[]
  >([]);
  const [selectedRateMunicipalityIds, setSelectedRateMunicipalityIds] =
    useState<string[]>([]);
  const [selectedRateLocationIds, setSelectedRateLocationIds] = useState<
    string[]
  >([]);
  const [municipalityProvinceFilters, setMunicipalityProvinceFilters] =
    useState<string[]>([]);
  const [rateTerritorySearch, setRateTerritorySearch] = useState("");
  const [selectedRateServiceIds, setSelectedRateServiceIds] = useState<
    string[]
  >([]);
  const [rateTransportMode, setRateTransportMode] = useState<
    "air" | "sea" | "express" | "ground" | "other"
  >("air");
  const [ratePerLb, setRatePerLb] = useState(0);
  const [minimumWeight, setMinimumWeight] = useState(0);
  const [maximumWeight, setMaximumWeight] = useState("");
  const [minimumCharge, setMinimumCharge] = useState(0);
  const [fixedFee, setFixedFee] = useState(0);
  const [estimatedDaysMin, setEstimatedDaysMin] = useState(7);
  const [estimatedDaysMax, setEstimatedDaysMax] = useState(15);
  const [ratePriority, setRatePriority] = useState(100);
  const [showAllRateTerritories, setShowAllRateTerritories] = useState(false);
  const [showAllRateServices, setShowAllRateServices] = useState(false);
  const [updatingGlobalStatus, setUpdatingGlobalStatus] = useState(false);

  const [feeName, setFeeName] = useState("");
  const [feeCode, setFeeCode] = useState("");
  const [feeAmount, setFeeAmount] = useState(0);
  const [feeType, setFeeType] = useState<"fixed" | "per_lb" | "percentage">(
    "fixed",
  );
  const [editingFeeId, setEditingFeeId] = useState<string | null>(null);

  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({
    countries: false,
    provinces: false,
    municipalities: false,
    locations: false,
  });

  const visibleProvinces = provinces.filter(
    (province) => province.country_id === selectedCountryId,
  );
  const visibleMunicipalities = municipalities.filter(
    (municipality) => municipality.province_id === selectedProvinceId,
  );
  const selectedProvinceMunicipalityIds = new Set(
    municipalities
      .filter((municipality) => municipality.province_id === selectedProvinceId)
      .map((municipality) => municipality.id),
  );

  const visibleLocations = locations.filter((location) =>
    selectedProvinceMunicipalityIds.has(location.municipality_id),
  );

  const activeRateCountries = countries.filter((item) => item.is_active);
  const activeRateProvinces = provinces.filter((item) => item.is_active);
  const activeRateMunicipalities = municipalities.filter(
    (item) => item.is_active,
  );
  const activeRateLocations = locations.filter((item) => item.is_active);

  const selectedRateTargetIds =
    rateScope === "country"
      ? selectedRateCountryIds
      : rateScope === "province"
        ? selectedRateProvinceIds
        : rateScope === "municipality"
          ? selectedRateMunicipalityIds
          : selectedRateLocationIds;

  const rateTerritoryItems = (() => {
    const search = rateTerritorySearch.trim().toLowerCase();

    if (rateScope === "country") {
      return activeRateCountries
        .map((item) => ({
          id: item.id,
          label: item.name,
          description: item.code,
        }))
        .filter(
          (item) =>
            !search ||
            `${item.label} ${item.description}`.toLowerCase().includes(search),
        );
    }

    if (rateScope === "province") {
      return activeRateProvinces
        .map((item) => ({
          id: item.id,
          label: item.name,
          description:
            countries.find((country) => country.id === item.country_id)?.name ||
            "Provincia",
        }))
        .filter(
          (item) =>
            !search ||
            `${item.label} ${item.description}`.toLowerCase().includes(search),
        );
    }

    if (rateScope === "municipality") {
      return activeRateMunicipalities
        .filter((item) =>
          municipalityProvinceFilters.length
            ? municipalityProvinceFilters.includes(item.province_id)
            : true,
        )
        .map((item) => ({
          id: item.id,
          label: item.name,
          description:
            provinces.find((province) => province.id === item.province_id)
              ?.name || "Municipio",
        }))
        .filter(
          (item) =>
            !search ||
            `${item.label} ${item.description}`.toLowerCase().includes(search),
        );
    }

    return activeRateLocations
      .map((item) => {
        const municipality = municipalities.find(
          (municipality) => municipality.id === item.municipality_id,
        );
        const province = provinces.find(
          (province) => province.id === municipality?.province_id,
        );
        return {
          id: item.id,
          label: item.name,
          description: [municipality?.name, province?.name, item.legacy_code]
            .filter(Boolean)
            .join(" · "),
        };
      })
      .filter(
        (item) =>
          !search ||
          `${item.label} ${item.description}`.toLowerCase().includes(search),
      );
  })();

  async function load() {
    if (!activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getShippingConfiguration(activeStore.id);

    if (result.error) {
      setMessage(result.error.message || "No se pudo cargar la configuración.");
      setIsError(true);
    }

    const resolvedSettings = result.settings || {
      id: "",
      store_id: activeStore.id,
      default_country_id: null,
      default_province_id: null,
      currency: "USD",
      phone_digits_min: 8,
      phone_digits_max: 15,
      default_rate_per_lb: 0,
      money_threshold: 1000,
      money_rate_below_threshold: 8,
      money_rate_at_or_above_threshold: 5,
      allow_manual_discount: true,
      maximum_manual_discount: null,
    };

    setSettings(resolvedSettings);
    setCountries(result.countries);
    setProvinces(result.provinces);
    setMunicipalities(result.municipalities);
    setLocations(result.locations);
    setServiceTypes(result.serviceTypes);
    setRates(result.rates);
    setExtraFees(result.extraFees);

    const initialCountry =
      selectedCountryId ||
      resolvedSettings.default_country_id ||
      result.countries[0]?.id ||
      "";

    const initialProvince =
      selectedProvinceId ||
      resolvedSettings.default_province_id ||
      result.provinces.find((item) => item.country_id === initialCountry)?.id ||
      "";

    const initialMunicipality =
      selectedMunicipalityId ||
      result.municipalities.find((item) => item.province_id === initialProvince)
        ?.id ||
      "";

    setSelectedCountryId(initialCountry);
    setSelectedProvinceId(initialProvince);
    setSelectedMunicipalityId(initialMunicipality);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function runAction(
    action: () => Promise<{ error: { message?: string } | null }>,
    successMessage: string,
  ) {
    setSaving(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await action();

      if (result.error) {
        throw new Error(result.error.message || "No se pudo guardar.");
      }

      setMessage(successMessage);
      await load();
    } catch (error) {
      const readable =
        error instanceof Error
          ? error.message
          : "No se pudo guardar el cambio.";
      setMessage(readable);
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  async function changeItemStatus(
    table:
      | "shipping_countries"
      | "shipping_provinces"
      | "shipping_municipalities"
      | "shipping_locations",
    id: string,
    currentActive: boolean,
    label: string,
  ) {
    await runAction(
      () => setShippingConfigItemActive(table, id, !currentActive),
      `${label} ${currentActive ? "desactivado" : "activado"}.`,
    );
  }

  async function permanentlyDeleteItem(
    table:
      | "shipping_countries"
      | "shipping_provinces"
      | "shipping_municipalities"
      | "shipping_locations",
    id: string,
    label: string,
  ) {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente "${label}"?\n\n` +
        "Hazlo solamente si fue creado por error y todavía no se usa. " +
        "Si tiene datos relacionados, Supabase bloqueará la eliminación.",
    );

    if (!confirmed) return;

    await runAction(
      () => deleteShippingConfigItem(table, id),
      `${label} eliminado definitivamente.`,
    );
  }

  function toggleList(key: string) {
    setExpandedLists((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  function toggleRateTarget(id: string) {
    const toggle = (current: string[]) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];

    if (rateScope === "country") setSelectedRateCountryIds(toggle);
    if (rateScope === "province") setSelectedRateProvinceIds(toggle);
    if (rateScope === "municipality") setSelectedRateMunicipalityIds(toggle);
    if (rateScope === "location") setSelectedRateLocationIds(toggle);
  }

  function selectAllRateTargets() {
    const ids = rateTerritoryItems.map((item) => item.id);
    if (rateScope === "country") setSelectedRateCountryIds(ids);
    if (rateScope === "province") setSelectedRateProvinceIds(ids);
    if (rateScope === "municipality") setSelectedRateMunicipalityIds(ids);
    if (rateScope === "location") setSelectedRateLocationIds(ids);
  }

  function clearRateTargets() {
    if (rateScope === "country") setSelectedRateCountryIds([]);
    if (rateScope === "province") setSelectedRateProvinceIds([]);
    if (rateScope === "municipality") setSelectedRateMunicipalityIds([]);
    if (rateScope === "location") setSelectedRateLocationIds([]);
  }

  function toggleRateService(id: string) {
    setSelectedRateServiceIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function saveBulkRates() {
    if (!activeStore?.id) return;

    const combinations =
      selectedRateTargetIds.length * selectedRateServiceIds.length;

    if (!combinations) {
      setMessage("Selecciona destinos y tipos de paquete.");
      setIsError(true);
      return;
    }

    const confirmed = window.confirm(
      `Se guardarán ${combinations} combinaciones de tarifa.\n\n` +
        `${selectedRateTargetIds.length} territorio(s) × ` +
        `${selectedRateServiceIds.length} tipo(s) de paquete.\n\n` +
        `Método: ${rateTransportMode === "air" ? "Aéreo" : rateTransportMode === "sea" ? "Marítimo" : rateTransportMode}.\n` +
        `Tarifa: $${ratePerLb.toFixed(2)} por libra.`,
    );

    if (!confirmed) return;

    await runAction(
      () =>
        upsertShippingRatesBulk({
          store_id: activeStore.id,
          scope_type: rateScope,
          target_ids: selectedRateTargetIds,
          service_type_ids: selectedRateServiceIds,
          transport_mode: rateTransportMode,
          rate_per_lb: ratePerLb,
          minimum_weight_lb: minimumWeight,
          maximum_weight_lb:
            maximumWeight === "" ? null : Number(maximumWeight),
          minimum_charge: minimumCharge,
          fixed_fee: fixedFee,
          estimated_days_min: estimatedDaysMin,
          estimated_days_max: estimatedDaysMax,
          priority: ratePriority,
        }),
      `${combinations} combinaciones de tarifa guardadas.`,
    );
  }

  async function removeRate(rate: ShippingRate) {
    if (!activeStore?.id) return;

    const territory =
      rate.scope_type === "country"
        ? countries.find((item) => item.id === rate.country_id)?.name
        : rate.scope_type === "province"
          ? provinces.find((item) => item.id === rate.province_id)?.name
          : rate.scope_type === "municipality"
            ? municipalities.find((item) => item.id === rate.municipality_id)
                ?.name
            : locations.find((item) => item.id === rate.location_id)?.name;
    const service = serviceTypes.find(
      (item) => item.id === rate.service_type_id,
    )?.name;
    const method =
      rate.transport_mode === "air"
        ? "Aéreo"
        : rate.transport_mode === "sea"
          ? "Marítimo"
          : rate.transport_mode === "express"
            ? "Express"
            : rate.transport_mode;

    const confirmed = window.confirm(
      `¿Eliminar esta tarifa?\n\n${territory || "Territorio"} · ${service || "Servicio"} · ${method}\n$${Number(rate.rate_per_lb || 0).toFixed(2)}/lb\n\nEl cotizador público dejará de usarla inmediatamente. Esta acción no se puede deshacer.`,
    );

    if (!confirmed) return;

    setDeletingRateId(rate.id);
    await runAction(
      () => deleteShippingRate(activeStore.id, rate.id),
      "Tarifa eliminada correctamente.",
    );
    setDeletingRateId(null);
  }

  async function changeGlobalShipmentStatus(
    status: "in_transit" | "received_cuba" | "out_for_delivery",
    label: string,
  ) {
    if (!activeStore?.id) return;

    const confirmed = window.confirm(
      `¿Cambiar todos los envíos activos a "${label}"?\n\n` +
        "No se modificarán envíos entregados, con incidencia o en papelera.",
    );

    if (!confirmed) return;

    setUpdatingGlobalStatus(true);
    setMessage("");
    setIsError(false);

    try {
      const result = await updateActiveShipmentsStatusBulk(
        activeStore.id,
        status,
      );

      if (result.error) {
        throw new Error(
          result.error.message || "No se pudo cambiar el estado general.",
        );
      }

      const count = result.data?.length || 0;
      setMessage(
        count > 0
          ? `${count} envío(s) actualizado(s) a "${label}".`
          : "No había envíos activos que necesitaran cambio.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cambiar el estado general.",
      );
    } finally {
      setUpdatingGlobalStatus(false);
    }
  }

  function startEditingFee(fee: ShippingExtraFee) {
    setEditingFeeId(fee.id);
    setFeeName(fee.name);
    setFeeCode(fee.code);
    setFeeAmount(Number(fee.amount || 0));
    setFeeType(fee.calculation_type);
    setMessage("");
    setIsError(false);
  }

  function cancelEditingFee() {
    setEditingFeeId(null);
    setFeeName("");
    setFeeCode("");
    setFeeAmount(0);
    setFeeType("fixed");
  }

  async function saveFee() {
    if (!activeStore?.id) return;

    if (!feeName.trim() || !feeCode.trim()) {
      setMessage("Escribe el nombre y el código del fee.");
      setIsError(true);
      return;
    }

    const action = editingFeeId
      ? () =>
          updateExtraFee(editingFeeId, {
            store_id: activeStore.id,
            name: feeName,
            code: feeCode,
            amount: feeAmount,
            calculation_type: feeType,
          })
      : () =>
          createExtraFee({
            store_id: activeStore.id,
            name: feeName,
            code: feeCode,
            amount: feeAmount,
            calculation_type: feeType,
          });

    await runAction(
      action,
      editingFeeId ? "Fee actualizado." : "Fee guardado.",
    );

    cancelEditingFee();
  }

  async function toggleFeeStatus(fee: ShippingExtraFee) {
    await runAction(
      () =>
        setShippingConfigItemActive(
          "shipping_extra_fees",
          fee.id,
          !fee.is_active,
        ),
      fee.is_active ? "Fee desactivado." : "Fee activado.",
    );
  }

  async function deleteFee(fee: ShippingExtraFee) {
    const confirmed = window.confirm(
      `¿Eliminar definitivamente "${fee.name}"?\n\n` +
        "Úsalo solamente si fue creado por error. Si ya está relacionado con " +
        "operaciones anteriores, Supabase puede bloquear la eliminación.",
    );

    if (!confirmed) return;

    await runAction(
      () => deleteShippingConfigItem("shipping_extra_fees", fee.id),
      "Fee eliminado.",
    );

    if (editingFeeId === fee.id) {
      cancelEditingFee();
    }
  }

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Cargando ajustes de envíos...
      </main>
    );
  }

  if (!activeStore || !settings) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        Selecciona una empresa.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-sm font-black text-blue-700">Operaciones</p>
          <h1 className="text-3xl font-black text-[#061b3a]">
            Ajustes de envíos
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Configura destinos, servicios, tarifas y fees de {activeStore.name}.
          </p>
        </header>

        <section className="mb-6 overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm">
          <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr] md:p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#061b3a] text-white shadow-lg">
              <MapPinned size={27} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
                Mapa de configuración
              </p>
              <h2 className="mt-1 text-xl font-black text-[#061b3a]">
                Cómo se organiza un destino
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StepCard number="1" title="País" icon={<Globe2 size={18} />} />
                <StepCard
                  number="2"
                  title="Provincia"
                  icon={<MapPinned size={18} />}
                />
                <StepCard
                  number="3"
                  title="Municipio"
                  icon={<MapPinned size={18} />}
                />
                <StepCard
                  number="4"
                  title="Destino para APK"
                  icon={<PackageCheck size={18} />}
                />
              </div>

              <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
                La APK seguirá usando una lista plana de destinos. País,
                provincia y municipio sirven únicamente para organizarla.
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div
            className={`mb-5 rounded-2xl p-4 text-sm font-black ${
              isError
                ? "border border-red-100 bg-red-50 text-red-700"
                : "border border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-6">
          <SettingsCard
            title="Configuración general"
            icon={<Settings2 />}
            className="order-1 lg:col-span-2 xl:col-span-6"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="País predeterminado">
                <select
                  value={settings.default_country_id || ""}
                  onChange={(event) => {
                    const countryId = event.target.value || null;

                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            default_country_id: countryId,
                            default_province_id: null,
                          }
                        : current,
                    );

                    setSelectedCountryId(countryId || "");
                    setSelectedProvinceId("");
                    setSelectedMunicipalityId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Sin predeterminar</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Provincia predeterminada">
                <select
                  value={settings.default_province_id || ""}
                  onChange={(event) => {
                    const provinceId = event.target.value || null;

                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            default_province_id: provinceId,
                          }
                        : current,
                    );

                    setSelectedProvinceId(provinceId || "");
                    setSelectedMunicipalityId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Sin predeterminar</option>
                  {provinces
                    .filter(
                      (province) =>
                        !settings.default_country_id ||
                        province.country_id === settings.default_country_id,
                    )
                    .map((province) => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Moneda">
                <input
                  value={settings.currency}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            currency: event.target.value.toUpperCase(),
                          }
                        : current,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Máximo de dígitos del teléfono">
                <input
                  type="number"
                  min="6"
                  max="20"
                  value={settings.phone_digits_max}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            phone_digits_max: Number(event.target.value),
                          }
                        : current,
                    )
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <h3 className="font-black text-emerald-950">
                Reglas para envío de dinero
              </h3>
              <p className="mt-1 text-sm font-semibold text-emerald-900/70">
                Debajo del límite se usa la primera tasa. Desde el límite, todo
                el monto usa la tasa reducida.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Límite para tasa reducida">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.money_threshold}
                    onChange={(e) =>
                      setSettings((c) =>
                        c
                          ? { ...c, money_threshold: Number(e.target.value) }
                          : c,
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Tasa debajo del límite (%)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.money_rate_below_threshold}
                    onChange={(e) =>
                      setSettings((c) =>
                        c
                          ? {
                              ...c,
                              money_rate_below_threshold: Number(
                                e.target.value,
                              ),
                            }
                          : c,
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Tasa desde el límite (%)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.money_rate_at_or_above_threshold}
                    onChange={(e) =>
                      setSettings((c) =>
                        c
                          ? {
                              ...c,
                              money_rate_at_or_above_threshold: Number(
                                e.target.value,
                              ),
                            }
                          : c,
                      )
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Descuento manual máximo">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.maximum_manual_discount ?? ""}
                    onChange={(e) =>
                      setSettings((c) =>
                        c
                          ? {
                              ...c,
                              maximum_manual_discount:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            }
                          : c,
                      )
                    }
                    className={inputClass}
                    placeholder="Sin límite"
                  />
                </Field>
              </div>
              <label className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-emerald-950">
                <input
                  type="checkbox"
                  checked={settings.allow_manual_discount}
                  onChange={(e) =>
                    setSettings((c) =>
                      c ? { ...c, allow_manual_discount: e.target.checked } : c,
                    )
                  }
                  className="h-5 w-5"
                />
                Permitir descuento manual en la comisión
              </label>
            </div>

            <button
              disabled={saving}
              onClick={() =>
                void runAction(
                  () => upsertShippingSettings(activeStore.id, settings),
                  "Configuración general guardada.",
                )
              }
              className={primaryButton}
            >
              <Save size={18} />
              Guardar configuración
            </button>
          </SettingsCard>

          <SettingsCard
            title="1. Países"
            icon={<Globe2 />}
            className="order-2 xl:col-span-2"
          >
            <p className={helpText}>
              Crea un país solamente si todavía no existe. Para Águila debe
              aparecer Cuba en la lista.
            </p>

            <div className="grid grid-cols-[minmax(0,1fr)_88px_48px] gap-2">
              <input
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
                className={inputClass}
                placeholder="Ej. Cuba"
              />
              <input
                value={countryCode}
                onChange={(event) => setCountryCode(event.target.value)}
                className={inputClass}
                placeholder="Ej. CU"
              />
              <button
                disabled={saving || !countryName.trim() || !countryCode.trim()}
                onClick={() =>
                  void runAction(
                    () =>
                      createCountry(activeStore.id, countryName, countryCode),
                    "País guardado.",
                  )
                }
                className={smallButton}
                title="Agregar país"
              >
                <Plus size={18} />
              </button>
            </div>

            <ManageableSelectionList
              items={countries.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: item.code,
                isActive: item.is_active,
              }))}
              selectedId={selectedCountryId}
              onSelect={(id) => {
                setSelectedCountryId(id);
                setSelectedProvinceId("");
                setSelectedMunicipalityId("");
              }}
              onToggle={(item) =>
                void changeItemStatus(
                  "shipping_countries",
                  item.id,
                  item.isActive,
                  item.title,
                )
              }
              onDelete={(item) =>
                void permanentlyDeleteItem(
                  "shipping_countries",
                  item.id,
                  item.title,
                )
              }
              emptyText="Todavía no hay países."
              maxVisible={3}
              expanded={expandedLists.countries}
              onToggleExpanded={() => toggleList("countries")}
            />
          </SettingsCard>

          <SettingsCard
            title="2. Provincias"
            icon={<MapPinned />}
            className="order-3 xl:col-span-2"
          >
            <p className={helpText}>
              Primero selecciona un país. Después crea o selecciona una
              provincia dentro de ese país.
            </p>

            <div className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">
              País seleccionado:{" "}
              {countries.find((item) => item.id === selectedCountryId)?.name ||
                "ninguno"}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_88px_48px] gap-2">
              <input
                value={provinceName}
                disabled={!selectedCountryId}
                onChange={(event) => setProvinceName(event.target.value)}
                className={inputClass}
                placeholder="Ej. Cienfuegos"
              />
              <input
                value={provinceCode}
                disabled={!selectedCountryId}
                onChange={(event) => setProvinceCode(event.target.value)}
                className={inputClass}
                placeholder="Código"
              />
              <button
                disabled={
                  saving ||
                  !selectedCountryId ||
                  !provinceName.trim() ||
                  !provinceCode.trim()
                }
                onClick={() =>
                  void runAction(
                    () =>
                      createProvince(
                        activeStore.id,
                        selectedCountryId,
                        provinceName,
                        provinceCode,
                      ),
                    "Provincia guardada.",
                  )
                }
                className={smallButton}
                title="Agregar provincia"
              >
                <Plus size={18} />
              </button>
            </div>

            <ManageableSelectionList
              items={visibleProvinces.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: item.code,
                isActive: item.is_active,
              }))}
              selectedId={selectedProvinceId}
              onSelect={(id) => {
                setSelectedProvinceId(id);
                setSelectedMunicipalityId("");
              }}
              onToggle={(item) =>
                void changeItemStatus(
                  "shipping_provinces",
                  item.id,
                  item.isActive,
                  item.title,
                )
              }
              onDelete={(item) =>
                void permanentlyDeleteItem(
                  "shipping_provinces",
                  item.id,
                  item.title,
                )
              }
              emptyText={
                selectedCountryId
                  ? "Este país todavía no tiene provincias."
                  : "Selecciona un país primero."
              }
              maxVisible={3}
              expanded={expandedLists.provinces}
              onToggleExpanded={() => toggleList("provinces")}
            />
          </SettingsCard>

          <SettingsCard
            title="3. Municipios"
            icon={<MapPinned />}
            className="order-4 xl:col-span-2"
          >
            <p className={helpText}>
              Selecciona una provincia y crea los municipios que necesites.
            </p>

            <div className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">
              Estás administrando los municipios de:{" "}
              {provinces.find((item) => item.id === selectedProvinceId)?.name ||
                "ninguna"}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_88px_48px] gap-2">
              <input
                value={municipalityName}
                disabled={!selectedProvinceId}
                onChange={(event) => setMunicipalityName(event.target.value)}
                className={inputClass}
                placeholder="Ej. Cienfuegos"
              />
              <input
                value={municipalityCode}
                disabled={!selectedProvinceId}
                onChange={(event) => setMunicipalityCode(event.target.value)}
                className={inputClass}
                placeholder="Código"
              />
              <button
                disabled={
                  saving ||
                  !selectedProvinceId ||
                  !municipalityName.trim() ||
                  !municipalityCode.trim()
                }
                onClick={() =>
                  void runAction(
                    () =>
                      createMunicipality(
                        activeStore.id,
                        selectedProvinceId,
                        municipalityName,
                        municipalityCode,
                      ),
                    "Municipio guardado.",
                  )
                }
                className={smallButton}
                title="Agregar municipio"
              >
                <Plus size={18} />
              </button>
            </div>

            <ManageableSelectionList
              items={visibleMunicipalities.map((item) => ({
                id: item.id,
                title: item.name,
                subtitle: item.code,
                isActive: item.is_active,
              }))}
              selectedId={selectedMunicipalityId}
              onSelect={setSelectedMunicipalityId}
              onToggle={(item) =>
                void changeItemStatus(
                  "shipping_municipalities",
                  item.id,
                  item.isActive,
                  item.title,
                )
              }
              onDelete={(item) =>
                void permanentlyDeleteItem(
                  "shipping_municipalities",
                  item.id,
                  item.title,
                )
              }
              emptyText={
                selectedProvinceId
                  ? "Esta provincia todavía no tiene municipios."
                  : "Selecciona una provincia primero."
              }
              maxVisible={3}
              expanded={expandedLists.municipalities}
              onToggleExpanded={() => toggleList("municipalities")}
            />
          </SettingsCard>

          <SettingsCard
            title="Destinos operativos (lista de la APK)"
            icon={<MapPinned />}
            className="order-6 xl:col-span-2"
          >
            <p className={helpText}>
              Aquí se muestra la lista plana que usará la APK. El municipio solo
              sirve para organizar el destino dentro de esta web.
            </p>

            <div className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">
              Provincia de la lista:{" "}
              {provinces.find((item) => item.id === selectedProvinceId)?.name ||
                "ninguna"}
              {" · "}
              Nuevo destino se guardará dentro de:{" "}
              {municipalities.find((item) => item.id === selectedMunicipalityId)
                ?.name || "selecciona un municipio"}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_110px_48px] gap-2">
              <input
                value={locationName}
                disabled={!selectedMunicipalityId}
                onChange={(event) => setLocationName(event.target.value)}
                className={inputClass}
                placeholder="Ej. Cienfuegos"
              />
              <input
                value={legacyCode}
                disabled={!selectedMunicipalityId}
                onChange={(event) => setLegacyCode(event.target.value)}
                className={inputClass}
                placeholder="Código APK: Cfgos"
              />
              <button
                disabled={
                  saving ||
                  !selectedMunicipalityId ||
                  !locationName.trim() ||
                  !legacyCode.trim()
                }
                onClick={() =>
                  void runAction(
                    () =>
                      createLocation(
                        activeStore.id,
                        selectedMunicipalityId,
                        locationName,
                        legacyCode,
                      ),
                    "Lugar guardado.",
                  )
                }
                className={smallButton}
                title="Agregar lugar"
              >
                <Plus size={18} />
              </button>
            </div>

            <ManageableSelectionList
              items={visibleLocations.map((item) => {
                const municipality = municipalities.find(
                  (candidate) => candidate.id === item.municipality_id,
                );

                return {
                  id: item.id,
                  title: item.name,
                  subtitle: `Código APK: ${item.legacy_code} · ${
                    municipality?.name || "Sin municipio"
                  }`,
                  isActive: item.is_active,
                };
              })}
              selectedId=""
              onSelect={() => undefined}
              onToggle={(item) =>
                void changeItemStatus(
                  "shipping_locations",
                  item.id,
                  item.isActive,
                  item.title,
                )
              }
              onDelete={(item) =>
                void permanentlyDeleteItem(
                  "shipping_locations",
                  item.id,
                  item.title,
                )
              }
              emptyText={
                selectedProvinceId
                  ? "Esta provincia todavía no tiene destinos operativos."
                  : "Selecciona una provincia primero."
              }
              selectable={false}
              maxVisible={3}
              expanded={expandedLists.locations}
              onToggleExpanded={() => toggleList("locations")}
            />
          </SettingsCard>

          <SettingsCard
            title="Tipos de servicio"
            icon={<Tags />}
            className="order-7 xl:col-span-2"
          >
            <p className={helpText}>
              Ejemplos: Paquete normal, Paquete grande y Dinero. El prefijo
              mantiene compatibilidad con la APK.
            </p>

            <div className="grid gap-3">
              <input
                value={serviceName}
                onChange={(event) => setServiceName(event.target.value)}
                className={inputClass}
                placeholder="Paquete normal"
              />
              <input
                value={serviceCode}
                onChange={(event) => setServiceCode(event.target.value)}
                className={inputClass}
                placeholder="normal"
              />
              <input
                value={legacyPrefix}
                onChange={(event) => setLegacyPrefix(event.target.value)}
                className={inputClass}
                placeholder="Prefijo APK: G_ o Dinero_"
              />
              <select
                value={billingMode}
                onChange={(event) =>
                  setBillingMode(
                    event.target.value as "per_lb" | "fixed" | "percentage",
                  )
                }
                className={inputClass}
              >
                <option value="per_lb">Por libra</option>
                <option value="fixed">Monto fijo</option>
                <option value="percentage">Porcentaje</option>
              </select>
            </div>

            <button
              disabled={saving || !serviceName.trim() || !serviceCode.trim()}
              onClick={() =>
                void runAction(
                  () =>
                    createServiceType(
                      activeStore.id,
                      serviceName,
                      serviceCode,
                      legacyPrefix,
                      billingMode,
                    ),
                  "Tipo de servicio guardado.",
                )
              }
              className={primaryButton}
            >
              <Plus size={18} />
              Guardar tipo de servicio
            </button>

            <SimpleRows
              rows={serviceTypes.map((service) => ({
                left: service.name,
                right: service.legacy_prefix || "Sin prefijo",
              }))}
              empty="No hay tipos de servicio."
            />
          </SettingsCard>

          <SettingsCard
            title="4. Tarifas por libra"
            icon={<DollarSign />}
            className="order-5 lg:col-span-2 xl:col-span-6"
          >
            <p className={helpText}>
              Aplica una misma tarifa a varias provincias, municipios, lugares
              operativos y tipos de paquete. Las tarifas más específicas tienen
              prioridad: lugar → municipio → provincia → país.
            </p>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                1. Alcance territorial
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["country", "País completo", "Tarifa general"],
                  ["province", "Provincias", "Una o varias"],
                  ["municipality", "Municipios", "Uno o varios"],
                  ["location", "Lugares operativos", "Lista usada por la APK"],
                ].map(([value, label, description]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => {
                      setRateScope(value as typeof rateScope);
                      setRateTerritorySearch("");
                      setShowAllRateTerritories(false);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      rateScope === value
                        ? "border-blue-500 bg-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                    }`}
                  >
                    <span className="block font-extrabold">{label}</span>
                    <span
                      className={`mt-1 block text-xs font-medium ${rateScope === value ? "text-blue-100" : "text-slate-500"}`}
                    >
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {rateScope === "municipality" && (
              <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-950">
                      Filtrar municipios por provincia
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      Puedes seleccionar varias provincias y después elegir
                      municipios de todas ellas.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setMunicipalityProvinceFilters(
                          activeRateProvinces.map((item) => item.id),
                        )
                      }
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm"
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setMunicipalityProvinceFilters([])}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm"
                    >
                      Sin filtro
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeRateProvinces.map((province) => {
                    const selected = municipalityProvinceFilters.includes(
                      province.id,
                    );
                    return (
                      <button
                        type="button"
                        key={province.id}
                        onClick={() =>
                          setMunicipalityProvinceFilters((current) =>
                            selected
                              ? current.filter((id) => id !== province.id)
                              : [...current, province.id],
                          )
                        }
                        className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? "border-blue-600 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-800"}`}
                      >
                        {province.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
                2. Método de transporte
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["air", "Aéreo", "Entrega rápida por avión"],
                  ["sea", "Marítimo", "Carga y paquetes por barco"],
                  ["express", "Express", "Servicio prioritario"],
                  ["ground", "Terrestre", "Transporte terrestre"],
                ].map(([value, label, description]) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      setRateTransportMode(value as typeof rateTransportMode)
                    }
                    className={`rounded-2xl border p-4 text-left transition ${
                      rateTransportMode === value
                        ? "border-blue-500 bg-blue-600 text-white shadow-md"
                        : "border-slate-200 bg-white text-slate-800 hover:border-blue-300"
                    }`}
                  >
                    <span className="block font-extrabold">{label}</span>
                    <span
                      className={`mt-1 block text-xs font-medium ${rateTransportMode === value ? "text-blue-100" : "text-slate-500"}`}
                    >
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-3">
                <Field
                  label={
                    rateScope === "country"
                      ? "Buscar país"
                      : rateScope === "province"
                        ? "Buscar provincia"
                        : rateScope === "municipality"
                          ? "Buscar municipio"
                          : "Buscar lugar operativo"
                  }
                >
                  <input
                    value={rateTerritorySearch}
                    onChange={(event) =>
                      setRateTerritorySearch(event.target.value)
                    }
                    className={inputClass}
                    placeholder="Escribe para filtrar..."
                  />
                </Field>
                <MultiSelectPanel
                  title={
                    rateScope === "country"
                      ? "Países"
                      : rateScope === "province"
                        ? "Provincias"
                        : rateScope === "municipality"
                          ? "Municipios"
                          : "Lugares operativos"
                  }
                  subtitle={`${selectedRateTargetIds.length} seleccionado(s)`}
                  items={rateTerritoryItems}
                  selectedIds={selectedRateTargetIds}
                  onToggle={toggleRateTarget}
                  onSelectAll={selectAllRateTargets}
                  onClear={clearRateTargets}
                  expanded={showAllRateTerritories}
                  onToggleExpanded={() =>
                    setShowAllRateTerritories((current) => !current)
                  }
                />
              </div>

              <MultiSelectPanel
                title="Tipos de paquete"
                subtitle={`${selectedRateServiceIds.length} seleccionado(s)`}
                items={serviceTypes
                  .filter(
                    (service) =>
                      service.is_active &&
                      service.billing_mode === "per_lb" &&
                      service.code.toLowerCase() !== "money",
                  )
                  .map((service) => ({
                    id: service.id,
                    label: service.name,
                    description: service.legacy_prefix || "Sin prefijo",
                  }))}
                selectedIds={selectedRateServiceIds}
                onToggle={toggleRateService}
                onSelectAll={() =>
                  setSelectedRateServiceIds(
                    serviceTypes
                      .filter(
                        (service) =>
                          service.is_active &&
                          service.billing_mode === "per_lb" &&
                          service.code.toLowerCase() !== "money",
                      )
                      .map((service) => service.id),
                  )
                }
                onClear={() => setSelectedRateServiceIds([])}
                expanded={showAllRateServices}
                onToggleExpanded={() =>
                  setShowAllRateServices((current) => !current)
                }
              />
            </div>

            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-950">
                    3. Valores que se aplicarán
                  </h3>
                  <p className="text-sm font-medium text-slate-500">
                    Las combinaciones existentes se actualizarán; las que falten
                    se crearán.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Precio por libra">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ratePerLb}
                    onChange={(event) =>
                      setRatePerLb(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Peso mínimo facturable">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumWeight}
                    onChange={(event) =>
                      setMinimumWeight(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Peso máximo (opcional)">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maximumWeight}
                    onChange={(event) => setMaximumWeight(event.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Cobro mínimo">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={minimumCharge}
                    onChange={(event) =>
                      setMinimumCharge(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Fee fijo adicional">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={fixedFee}
                    onChange={(event) =>
                      setFixedFee(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Entrega mínima (días)">
                  <input
                    type="number"
                    min="0"
                    value={estimatedDaysMin}
                    onChange={(event) =>
                      setEstimatedDaysMin(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Entrega máxima (días)">
                  <input
                    type="number"
                    min="0"
                    value={estimatedDaysMax}
                    onChange={(event) =>
                      setEstimatedDaysMax(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
                <Field label="Prioridad">
                  <input
                    type="number"
                    min="1"
                    value={ratePriority}
                    onChange={(event) =>
                      setRatePriority(Number(event.target.value))
                    }
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {selectedRateTargetIds.length *
                      selectedRateServiceIds.length}{" "}
                    combinación(es)
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    {selectedRateTargetIds.length} territorio(s) ×{" "}
                    {selectedRateServiceIds.length} tipo(s) · Método:{" "}
                    {rateTransportMode === "air"
                      ? "Aéreo"
                      : rateTransportMode === "sea"
                        ? "Marítimo"
                        : rateTransportMode}{" "}
                    · Alcance:{" "}
                    {rateScope === "country"
                      ? "país"
                      : rateScope === "province"
                        ? "provincia"
                        : rateScope === "municipality"
                          ? "municipio"
                          : "lugar operativo"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={
                    saving ||
                    !selectedRateTargetIds.length ||
                    !selectedRateServiceIds.length ||
                    ratePerLb < 0
                  }
                  onClick={() => void saveBulkRates()}
                  className={primaryButton}
                >
                  <Save size={18} />
                  Aplicar tarifa a{" "}
                  {selectedRateTargetIds.length *
                    selectedRateServiceIds.length}{" "}
                  combinación(es)
                </button>
              </div>
            </div>

            <CollapsibleRateList
              rates={rates}
              countries={countries}
              provinces={provinces}
              municipalities={municipalities}
              locations={locations}
              serviceTypes={serviceTypes}
              deletingRateId={deletingRateId}
              onDelete={(rate) => void removeRate(rate)}
            />
          </SettingsCard>

          <SettingsCard
            title="Estado general de los envíos"
            icon={<Send />}
            className="order-8 xl:col-span-2"
          >
            <p className={helpText}>
              Funciona como el control de la APK. Con un solo botón cambia el
              estado de todos los envíos activos de esta empresa.
            </p>

            <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              Los envíos entregados, con incidencia o enviados a la papelera se
              conservan sin cambios.
            </div>

            <div className="grid gap-3">
              <GlobalStatusButton
                icon={<Send size={20} />}
                title="En tránsito hacia Cuba"
                description="Los paquetes ya salieron."
                disabled={updatingGlobalStatus}
                onClick={() =>
                  void changeGlobalShipmentStatus(
                    "in_transit",
                    "En tránsito hacia Cuba",
                  )
                }
              />

              <GlobalStatusButton
                icon={<Warehouse size={20} />}
                title="Recibido en Cuba"
                description="La carga ya fue recibida."
                disabled={updatingGlobalStatus}
                onClick={() =>
                  void changeGlobalShipmentStatus(
                    "received_cuba",
                    "Recibido en Cuba",
                  )
                }
              />

              <GlobalStatusButton
                icon={<PackageOpen size={20} />}
                title="En reparto"
                description="Los paquetes salieron a entrega."
                disabled={updatingGlobalStatus}
                onClick={() =>
                  void changeGlobalShipmentStatus(
                    "out_for_delivery",
                    "En reparto",
                  )
                }
              />
            </div>

            {updatingGlobalStatus && (
              <div className="flex items-center gap-3 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-800">
                <Loader2 size={18} className="animate-spin" />
                Actualizando los envíos...
              </div>
            )}
          </SettingsCard>

          <SettingsCard
            title="Fees adicionales"
            icon={<DollarSign />}
            className="order-9 xl:col-span-2"
          >
            <p className={helpText}>
              Cargos para equipos o servicios especiales: televisor,
              refrigerador, bicicleta, entrega especial, etc.
            </p>

            {editingFeeId && (
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-blue-700">
                    Editando fee
                  </p>
                  <p className="mt-1 font-extrabold text-blue-950">
                    {feeName || "Fee seleccionado"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={cancelEditingFee}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700"
                >
                  <X size={16} />
                  Cancelar edición
                </button>
              </div>
            )}

            <div className="grid gap-3">
              <Field label="Nombre del fee">
                <input
                  value={feeName}
                  onChange={(event) => setFeeName(event.target.value)}
                  className={inputClass}
                  placeholder="Ej. Televisor"
                />
              </Field>

              <Field label="Código interno">
                <input
                  value={feeCode}
                  onChange={(event) => setFeeCode(event.target.value)}
                  className={inputClass}
                  placeholder="Ej. tv"
                />
              </Field>

              <Field label="Importe">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeAmount}
                  onChange={(event) => setFeeAmount(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>

              <Field label="Forma de cálculo">
                <select
                  value={feeType}
                  onChange={(event) =>
                    setFeeType(
                      event.target.value as "fixed" | "per_lb" | "percentage",
                    )
                  }
                  className={inputClass}
                >
                  <option value="fixed">Monto fijo</option>
                  <option value="per_lb">Por libra</option>
                  <option value="percentage">Porcentaje</option>
                </select>
              </Field>
            </div>

            <button
              type="button"
              disabled={saving || !feeName.trim() || !feeCode.trim()}
              onClick={() => void saveFee()}
              className={primaryButton}
            >
              {editingFeeId ? <Save size={18} /> : <Plus size={18} />}
              {editingFeeId ? "Guardar cambios" : "Guardar fee"}
            </button>

            <div className="space-y-3">
              {extraFees.map((fee) => (
                <article
                  key={fee.id}
                  className={`rounded-2xl border p-4 transition ${
                    fee.is_active
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-200 bg-slate-100 opacity-65"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-slate-950">
                          {fee.name}
                        </h3>

                        {!fee.is_active && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-600">
                            Inactivo
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Código: {fee.code} ·{" "}
                        {fee.calculation_type === "fixed"
                          ? "Monto fijo"
                          : fee.calculation_type === "per_lb"
                            ? "Por libra"
                            : "Porcentaje"}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-extrabold text-emerald-700">
                        {fee.calculation_type === "percentage"
                          ? `${Number(fee.amount).toFixed(2)}%`
                          : fee.calculation_type === "per_lb"
                            ? `$${Number(fee.amount).toFixed(2)}/lb`
                            : `$${Number(fee.amount).toFixed(2)}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEditingFee(fee)}
                        className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                      >
                        <Edit3 size={16} />
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleFeeStatus(fee)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        title={fee.is_active ? "Desactivar" : "Activar"}
                      >
                        {fee.is_active ? (
                          <PowerOff size={16} />
                        ) : (
                          <Power size={16} />
                        )}
                        {fee.is_active ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteFee(fee)}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}

              {!extraFees.length && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-medium text-slate-400">
                  Todavía no hay fees configurados.
                </div>
              )}
            </div>
          </SettingsCard>
        </div>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const primaryButton =
  "mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#061b3a] to-[#123D8D] px-5 py-3 text-sm font-black text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40";
const smallButton =
  "inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#061b3a] to-[#123D8D] px-4 py-3 text-white shadow-md transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-30";
const helpText = "text-sm font-semibold leading-6 text-slate-500";

function SettingsCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#061b3a] text-white shadow-md transition group-hover:scale-105">
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700">
              Configuración
            </p>
            <h2 className="text-xl font-black text-[#061b3a]">{title}</h2>
          </div>
        </div>
      </div>
      <div className="p-5 md:p-6">
        <div className="space-y-4">{children}</div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

type ManageableItem = {
  id: string;
  title: string;
  subtitle: string;
  isActive: boolean;
};

function ManageableSelectionList({
  items,
  selectedId,
  onSelect,
  onToggle,
  onDelete,
  emptyText,
  selectable = true,
  maxVisible = 3,
  expanded = false,
  onToggleExpanded,
}: {
  items: ManageableItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  onToggle: (item: ManageableItem) => void;
  onDelete: (item: ManageableItem) => void;
  emptyText: string;
  selectable?: boolean;
  maxVisible?: number;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-400">
        {emptyText}
      </div>
    );
  }

  const visibleItems = expanded ? items : items.slice(0, maxVisible);
  const hiddenCount = Math.max(items.length - maxVisible, 0);

  return (
    <div className="space-y-2">
      {visibleItems.map((item) => {
        const selected = selectedId === item.id;

        return (
          <div
            key={item.id}
            className={`flex items-center gap-2 rounded-2xl border p-2 transition ${
              selected
                ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
                : item.isActive
                  ? "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                  : "border-slate-200 bg-slate-100 opacity-65"
            }`}
          >
            <button
              type="button"
              disabled={!selectable}
              onClick={() => onSelect(item.id)}
              className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left ${
                selectable ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                <MapPinned size={16} className="shrink-0 text-blue-700" />
                <span className="truncate">{item.title}</span>
                {!item.isActive && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase text-slate-600">
                    Inactivo
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate pl-6 text-xs font-semibold text-slate-400">
                {item.subtitle}
              </span>
            </button>

            {selected && (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                <CheckCircle2 size={17} />
              </div>
            )}

            <button
              type="button"
              onClick={() => onToggle(item)}
              className="rounded-xl border bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              title={item.isActive ? "Desactivar" : "Activar"}
            >
              {item.isActive ? <PowerOff size={17} /> : <Power size={17} />}
            </button>

            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded-xl border border-red-100 bg-white p-2 text-red-500 transition hover:bg-red-50"
              title="Eliminar definitivamente"
            >
              <Trash2 size={17} />
            </button>
          </div>
        );
      })}

      {items.length > maxVisible && onToggleExpanded && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-sm font-black text-blue-800 transition hover:bg-blue-100"
        >
          {expanded ? (
            <>
              <ChevronUp size={18} />
              Mostrar solo los primeros {maxVisible}
            </>
          ) : (
            <>
              <ChevronDown size={18} />
              Ver {hiddenCount} más
            </>
          )}
        </button>
      )}
    </div>
  );
}

function StepCard({
  number,
  title,
  icon,
}: {
  number: string;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 font-black text-blue-800">
        {number}
      </div>
      <div className="text-blue-800">{icon}</div>
      <span className="text-sm font-black text-[#061b3a]">{title}</span>
    </div>
  );
}

type MultiSelectItem = {
  id: string;
  label: string;
  description?: string;
};

function MultiSelectPanel({
  title,
  subtitle,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  expanded,
  onToggleExpanded,
}: {
  title: string;
  subtitle: string;
  items: MultiSelectItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const visibleItems = expanded ? items : items.slice(0, 5);
  const hiddenCount = Math.max(items.length - 5, 0);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
        <div>
          <h3 className="font-extrabold text-slate-950">{title}</h3>
          <p className="text-xs font-medium text-slate-500">{subtitle}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            Todos
          </button>

          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="space-y-2 p-3">
        {visibleItems.map((item) => {
          const selected = selectedIds.includes(item.id);

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                selected
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                  selected
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-transparent"
                }`}
              >
                <CheckCircle2 size={15} />
              </span>

              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">
                  {item.label}
                </span>
                {item.description && (
                  <span className="block truncate text-xs font-medium text-slate-400">
                    {item.description}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {!items.length && (
          <div className="rounded-2xl border border-dashed p-4 text-center text-sm font-medium text-slate-400">
            No hay opciones disponibles.
          </div>
        )}

        {items.length > 5 && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-3 text-sm font-bold text-blue-700"
          >
            {expanded ? (
              <>
                <ChevronUp size={17} />
                Mostrar solo 5
              </>
            ) : (
              <>
                <ChevronDown size={17} />
                Ver {hiddenCount} más
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function GlobalStatusButton({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
        {icon}
      </div>

      <h3 className="mt-4 font-extrabold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
        {description}
      </p>
    </button>
  );
}

function CollapsibleRateList({
  rates,
  countries,
  provinces,
  municipalities,
  locations,
  serviceTypes,
  deletingRateId,
  onDelete,
}: {
  rates: ShippingRate[];
  countries: ShippingCountry[];
  provinces: ShippingProvince[];
  municipalities: ShippingMunicipality[];
  locations: ShippingLocation[];
  serviceTypes: ShippingServiceType[];
  deletingRateId: string | null;
  onDelete: (rate: ShippingRate) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleRates = expanded ? rates : rates.slice(0, 5);

  if (!rates.length) {
    return (
      <div className="rounded-2xl border border-dashed p-4 text-sm font-medium text-slate-400">
        Todavía no hay tarifas.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
        <div>
          <h3 className="font-extrabold text-slate-950">
            Tarifas configuradas
          </h3>
          <p className="text-xs font-medium text-slate-500">
            {rates.length} combinación(es)
          </p>
        </div>

        {rates.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? "Mostrar 5" : `Ver ${rates.length - 5} más`}
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {visibleRates.map((rate) => {
          const territory =
            rate.scope_type === "country"
              ? countries.find((item) => item.id === rate.country_id)?.name
              : rate.scope_type === "province"
                ? provinces.find((item) => item.id === rate.province_id)?.name
                : rate.scope_type === "municipality"
                  ? municipalities.find(
                      (item) => item.id === rate.municipality_id,
                    )?.name
                  : locations.find((item) => item.id === rate.location_id)
                      ?.name;
          const scopeLabel =
            rate.scope_type === "country"
              ? "País"
              : rate.scope_type === "province"
                ? "Provincia"
                : rate.scope_type === "municipality"
                  ? "Municipio"
                  : "Lugar APK";
          const service = serviceTypes.find(
            (item) => item.id === rate.service_type_id,
          );

          return (
            <div
              key={rate.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {territory || "Territorio"} · {service?.name || "Servicio"} ·{" "}
                  {rate.transport_mode === "air"
                    ? "Aéreo"
                    : rate.transport_mode === "sea"
                      ? "Marítimo"
                      : rate.transport_mode}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  {scopeLabel} · Mínimo:{" "}
                  {Number(rate.minimum_weight_lb || 0).toFixed(2)} lb · Cobro
                  mínimo: ${Number(rate.minimum_charge || 0).toFixed(2)} ·
                  Entrega: {rate.estimated_days_min ?? "?"}-
                  {rate.estimated_days_max ?? "?"} días
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-extrabold text-emerald-700">
                  ${Number(rate.rate_per_lb).toFixed(2)}/lb
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(rate)}
                  disabled={deletingRateId === rate.id}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                  aria-label={`Eliminar tarifa de ${territory || "territorio"}`}
                  title="Eliminar tarifa"
                >
                  {deletingRateId === rate.id ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Trash2 size={17} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimpleRows({
  rows,
  empty,
}: {
  rows: Array<{ left: string; right: string }>;
  empty: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed p-4 text-sm font-semibold text-slate-400">
        {empty}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={`${row.left}-${index}`}
          className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold"
        >
          <span>{row.left}</span>
          <span>{row.right}</span>
        </div>
      ))}
    </div>
  );
}
