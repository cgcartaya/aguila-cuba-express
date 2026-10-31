"use client";

import { use, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useStore } from '@/hooks/useStore';
import { getShipmentById } from '@/lib/services/shipping';
import { getShippingConfiguration } from '@/lib/services/shipping-settings';
import { packageInvoiceUrl, normalizePackageContents } from '@/lib/shipping/package-label';
import PackageLabelDocument, { type PackageLabelData } from '@/components/shipping/PackageLabelDocument';
import './label.css';

export default function PackageLabelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [data, setData] = useState<PackageLabelData | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [packingList, setPackingList] = useState(false);
  useEffect(() => {
    if (accessLoading || storeLoading || !store) return;
    let cancelled = false;
    async function load() {
      setData(null); setQr(null); setError(''); setWarning('');
      try {
        const [result, config] = await Promise.all([getShipmentById(store!.id, id), getShippingConfiguration(store!.id)]);
        if (result.error || !result.data?.contains_package) throw new Error('No se encontró un envío con paquete en esta agencia.');
        const shipment = result.data;
        if (!shipment.package_number) throw new Error('El número de paquete todavía no está disponible.');
        const destination = [config.municipalities.find(item => item.id === shipment.municipality_id)?.name, config.provinces.find(item => item.id === shipment.province_id)?.name, config.countries.find(item => item.id === shipment.country_id)?.name].filter(Boolean).join(' · ') || shipment.location || 'Destino por confirmar';
        const date = new Date(shipment.created_at || shipment.created_date || Date.now());
        const label: PackageLabelData = { agency: store!.name, packageNumber: shipment.package_number, trackingCode: shipment.tracking_code || '', recipient: shipment.recipient_name || 'Por confirmar', address: shipment.recipient_address || 'Dirección por confirmar', phone: shipment.recipient_phone || 'No indicado', sender: shipment.sender_name || 'No indicado', service: shipment.service_type_name || 'Paquete', destination, weightLb: Number(shipment.weight_lb || 0), billingMode: shipment.package_billing_mode || "weight", date: Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-US'), contents: normalizePackageContents(shipment.package_contents) };
        let code: string | null = null;
        let message = '';
        if (!shipment.public_tracking_enabled) message = 'La factura pública está desactivada. Activa el acceso público al editar el envío para poder imprimir su etiqueta con QR.';
        else {
          try { code = await QRCode.toDataURL(packageInvoiceUrl(store!, label.trackingCode, window.location.origin), { errorCorrectionLevel: 'M', margin: 4, width: 384, color: { dark: '#000000', light: '#ffffff' } }); }
          catch { message = 'No se pudo preparar el QR de la factura. Revisa el código de rastreo y vuelve a abrir esta página.'; }
        }
        if (!cancelled) { setData(label); setQr(code); setWarning(message); }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : 'No se pudo preparar la etiqueta.'); }
    }
    void load();
    return () => { cancelled = true; };
  }, [accessLoading, storeLoading, store, id]);
  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (!data) return <main className="p-8">Preparando etiqueta...</main>;
  return <main className="package-print-screen">
    <style>{`@page { size: ${packingList ? 'A4' : '4in 6in'}; margin: ${packingList ? '12mm' : '0'}; }`}</style>
    <div className="package-print-controls">
      <a href={`/admin/shipping/${encodeURIComponent(id)}/invoice`}>Volver a factura</a>
      <button onClick={() => setPackingList(false)} aria-pressed={!packingList}>Etiqueta 4×6</button>
      <button onClick={() => setPackingList(true)} aria-pressed={packingList}>Lista de contenido A4</button>
      <button disabled={!packingList && !qr} onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      <p className="w-full text-sm text-slate-600">{packingList ? 'La lista completa incluye casillas para comprobar la entrega.' : 'Imprime al 100 %, sin encabezados ni pies del navegador. El QR abre la factura de este envío. La etiqueta resume hasta cuatro artículos; la factura y la lista A4 muestran todos.'}</p>
      {warning && <p className="package-print-warning">{warning} <a href={`/admin/shipping/${encodeURIComponent(id)}/edit`}>Editar envío</a></p>}
    </div>
    <div className="package-print-document"><PackageLabelDocument data={data} qr={qr} packingList={packingList} /></div>
  </main>;
}
