/* eslint-disable @next/next/no-img-element -- QR data URLs must print pixel-for-pixel without image optimization. */
import { packageNumber, type PackageContentItem } from '@/lib/shipping/package-label';

export type PackageLabelData = {
  agency: string;
  packageNumber: number | string;
  trackingCode: string;
  recipient: string;
  address: string;
  phone: string;
  sender: string;
  service: string;
  destination: string;
  weightLb: number;
  billingMode?: "weight" | "fees_only";
  date: string;
  contents: PackageContentItem[];
};

export default function PackageLabelDocument({ data, qr, packingList = false }: { data: PackageLabelData; qr: string | null; packingList?: boolean }) {
  if (packingList) return <article className="package-packing-list">
    <header className="package-list-header"><div><strong>{data.agency}</strong><h1>Lista de contenido</h1><p>{packageNumber(data.packageNumber)} · {data.date}</p></div>{qr && <img src={qr} alt="QR de la factura" width={110} height={110} />}</header>
    <div className="package-list-parties"><p><b>Destinatario:</b> {data.recipient}<br />{data.address}<br />{data.destination}<br />Tel.: {data.phone}</p><p><b>Remitente:</b> {data.sender}<br /><b>Servicio:</b> {data.service}<br />{data.billingMode === "fees_only" ? <><b>Cobro:</b> Por artículo</> : <><b>Peso:</b> {data.weightLb.toFixed(2)} lb</>}<br /><b>Rastreo:</b> {data.trackingCode}</p></div>
    <table><thead><tr><th>Comprobar</th><th>Cantidad</th><th>Descripción</th></tr></thead><tbody>{data.contents.map((item, index) => <tr key={index}><td><span className="package-check-box" /></td><td>{item.quantity}</td><td>{item.description}</td></tr>)}</tbody></table>
    {data.contents.length === 0 && <p>No se ha declarado el contenido de este paquete.</p>}
    <footer className="package-list-footer"><p>Recibido por: ______________________________ Firma: ______________________</p><p>Fecha: __________________ Observaciones: _________________________________</p></footer>
  </article>;

  const preview = data.contents.slice(0, 4);
  return <article className="package-label">
    <header className="package-label-header"><div><p className="package-agency">{data.agency}</p><p className="package-caption">N.º DE PAQUETE</p><h1>{packageNumber(data.packageNumber)}</h1><p className="package-tracking">{data.trackingCode}</p></div><div className="package-qr">{qr && <img src={qr} alt="Escanea para consultar la factura" width={128} height={128} />}<p>ESCANEA LA FACTURA</p></div></header>
    <section className="package-recipient"><p className="package-caption">DESTINATARIO</p><h2>{data.recipient}</h2><p className="package-address">{data.address}</p><p className="package-destination">{data.destination}</p><p><b>Tel.:</b> {data.phone}</p></section>
    <section className="package-route"><p><b>Remitente:</b> {data.sender}</p><p><b>Servicio:</b> {data.service}</p></section>
    <section className="package-label-contents"><p className="package-caption">CONTENIDO</p>{preview.length ? <ul>{preview.map((item, index) => <li key={index}><b>{item.quantity} ×</b> {item.description}</li>)}</ul> : <p>No declarado</p>}{data.contents.length > preview.length && <p className="package-more">+ {data.contents.length - preview.length} artículo(s). Lista completa en la factura.</p>}</section>
  </article>;
}
