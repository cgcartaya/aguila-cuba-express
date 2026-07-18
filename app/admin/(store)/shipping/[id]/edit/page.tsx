"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

import ShipmentForm from "@/components/admin/shipping/ShipmentForm";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  getShipmentById,
  getShipmentFees,
  getShippingDriversByStoreId,
  updateShipment,
} from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import type {
  Shipment,
  ShipmentFeeSelection,
  ShipmentInput,
  ShippingCountry,
  ShippingDriver,
  ShippingExtraFee,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingRate,
  ShippingServiceType,
  ShippingSettings,
} from "@/lib/shipping/types";

export default function EditShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const {
    access,
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [selectedFees, setSelectedFees] = useState<ShipmentFeeSelection[]>([]);
  const [drivers, setDrivers] = useState<ShippingDriver[]>([]);
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [countries, setCountries] = useState<ShippingCountry[]>([]);
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ShippingServiceType[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [extraFees, setExtraFees] = useState<ShippingExtraFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  useEffect(() => {
    async function loadData() {
      if (!activeStore?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [shipmentResult, feesResult, driversResult, config] =
        await Promise.all([
          getShipmentById(activeStore.id, id),
          getShipmentFees(id),
          getShippingDriversByStoreId(activeStore.id),
          getShippingConfiguration(activeStore.id),
        ]);

      if (shipmentResult.error || !shipmentResult.data) {
        setErrorMessage("No se encontró el envío.");
        setShipment(null);
      } else {
        setShipment(shipmentResult.data);
      }

      setSelectedFees(
        (feesResult.data || []).map((fee) => ({
          fee_id: fee.fee_id,
          fee_name: fee.fee_name,
          calculation_type: fee.calculation_type,
          configured_amount: Number(fee.configured_amount),
          calculated_amount: Number(fee.calculated_amount),
        }))
      );
      setDrivers(driversResult.data || []);
      setSettings(config.settings);
      setCountries(config.countries);
      setProvinces(config.provinces);
      setMunicipalities(config.municipalities);
      setLocations(config.locations);
      setServiceTypes(config.serviceTypes);
      setRates(config.rates);
      setExtraFees(config.extraFees);
      setLoading(false);
    }

    if (!accessLoading && !storeLoading) void loadData();
  }, [accessLoading, storeLoading, activeStore?.id, id]);

  async function submit(input: ShipmentInput) {
    if (!activeStore?.id || !shipment) {
      throw new Error("No se pudo resolver el envío.");
    }

    setSubmitting(true);
    const { error } = await updateShipment(
      activeStore.id,
      shipment.id,
      input,
      access?.profile?.id
    );
    setSubmitting(false);

    if (error) throw new Error(error.message);

    router.push("/admin/shipping");
    router.refresh();
  }

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Cargando envío...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/shipping"
            className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>

          <Link
            href="/admin/shipping/settings"
            className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black"
          >
            <Settings size={18} />
            Ajustes
          </Link>
        </div>

        {errorMessage || !shipment ? (
          <div className="rounded-3xl bg-red-50 p-8 text-center font-bold text-red-700">
            {errorMessage || "Envío no disponible."}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-sm font-black text-blue-700">Operaciones</p>
              <h1 className="text-3xl font-black text-[#061b3a]">
                Editar envío
              </h1>
              <p className="text-sm font-semibold text-slate-500">
                {shipment.tracking_code}
              </p>
            </div>

            <ShipmentForm
          storeId={activeStore?.id || ""}
              shipment={shipment}
              drivers={drivers}
              settings={settings}
              countries={countries}
              provinces={provinces}
              municipalities={municipalities}
              locations={locations}
              serviceTypes={serviceTypes}
              rates={rates}
              extraFees={extraFees}
              initialSelectedFees={selectedFees}
              submitting={submitting}
              onSubmit={submit}
            />
          </>
        )}
      </div>
    </main>
  );
}
