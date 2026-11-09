import { packageNumber } from "@/lib/shipping/package-label";
import { deliveryLabel, remittanceItemKey } from "@/lib/shipping/remittance-delivery";
import type { Shipment, ShipmentItem } from "@/lib/shipping/types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const amount = (value?: number | null) => usd.format(Number(value || 0));

type Props = {
  shipment: Shipment;
  items: Partial<ShipmentItem>[];
  name: string;
  date: string;
  website: string | null;
  logoUrl: string | null;
  addressLines: string[];
};

export default function AlvarezInvoice({ shipment, items, name, date, website, logoUrl, addressLines }: Props) {
  const hasWeightedPackage = shipment.contains_package && !shipment.products_only &&
    shipment.package_billing_mode !== "fees_only";
  const operation = shipment.products_only ? "Entrega de productos" :
    shipment.contains_package && shipment.contains_money ? "Paquete y remesa" :
    shipment.contains_money ? "Envío de dinero" : "Envío de paquete";
  const rows = items.length ? items : [
    ...(hasWeightedPackage ? [{
      id: "package", item_type: "PACKAGE", description: shipment.service_type_name || "Servicio de paquete",
      quantity: shipment.weight_lb, unit: "lb", unit_price: shipment.rate_per_lb, total: shipment.weight_subtotal,
    }] : []),
    ...(shipment.contains_money ? [{
      id: "money", item_type: "MONEY", description: "Servicio de remesa", total: shipment.money_total,
    }] : []),
    ...(shipment.extra_fees_total > 0 ? [{
      id: "fees", item_type: "EXTRA_FEE", description: "Cargos adicionales",
      quantity: 1, unit_price: shipment.extra_fees_total, total: shipment.extra_fees_total,
    }] : []),
    ...(shipment.discount_amount > 0 ? [{
      id: "discount", item_type: "DISCOUNT", description: shipment.discount_reason || "Descuento general",
      quantity: 1, unit_price: -shipment.discount_amount, total: -shipment.discount_amount,
    }] : []),
  ] as Partial<ShipmentItem>[];

  return <article className="invoice-document alvarez-invoice">
    <style>{`
      .alvarez-invoice { background: white; color: #151515; padding: 24px; font: 14px/1.35 Arial, sans-serif; overflow-wrap: anywhere; }
      .alvarez-invoice p, .alvarez-invoice h1, .alvarez-invoice h2 { margin: 0; }
      .alvarez-invoice header, .alvarez-invoice .invoice-parties, .alvarez-invoice .invoice-summary, .alvarez-invoice footer { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .alvarez-invoice header { grid-template-columns: minmax(0, 1fr) auto; align-items: start; padding-bottom: 9px; border-bottom: 2px solid #222; }
      .alvarez-invoice .invoice-brand { display: flex; align-items: center; gap: 12px; }
      .alvarez-invoice .invoice-brand img { width: 120px; max-width: 35%; height: 90px; object-fit: contain; }
      .alvarez-invoice h1 { font-size: 1.35em; }
      .alvarez-invoice h2 { font-size: .86em; text-transform: uppercase; letter-spacing: .05em; }
      .alvarez-invoice .invoice-reference { text-align: right; }
      .alvarez-invoice .invoice-parties { padding: 9px 0; }
      .alvarez-invoice .invoice-context { border-top: 1px solid #aaa; padding: 5px 0; }
      .alvarez-invoice table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
      .alvarez-invoice th, .alvarez-invoice td { padding: 4px 6px; text-align: left; vertical-align: top; border-bottom: 1px solid #aaa; }
      .alvarez-invoice th { background: #eee; border-top: 1px solid #777; }
      .alvarez-invoice .number { text-align: right; white-space: nowrap; }
      .alvarez-invoice .invoice-summary { grid-template-columns: minmax(0, 1fr) minmax(12em, 35%); margin-top: 8px; }
      .alvarez-invoice .invoice-notes { white-space: pre-wrap; }
      .alvarez-invoice .invoice-totals { margin: 0; }
      .alvarez-invoice .invoice-totals div { display: flex; justify-content: space-between; gap: 10px; padding: 2px 0; }
      .alvarez-invoice .invoice-totals dd { margin: 0; white-space: nowrap; }
      .alvarez-invoice .invoice-balance { border-top: 1px solid #222; font-weight: bold; }
      .alvarez-invoice footer { margin-top: 22px; }
      .alvarez-invoice footer p { border-top: 1px solid #777; padding-top: 3px; }
      .alvarez-invoice .invoice-website { margin-top: 6px; }
      @media screen and (max-width: 480px) {
        .alvarez-invoice { padding: 12px; font-size: 12px; }
        .alvarez-invoice .invoice-brand { display: block; }
        .alvarez-invoice .invoice-brand img { max-width: 100%; width: 90px; }
      }
      @media print {
        .invoice-document.alvarez-invoice { box-sizing: border-box; border: 0 !important; padding: 0; font-size: 10pt; overflow: visible; }
        .alvarez-invoice header, .alvarez-invoice tr, .alvarez-invoice .invoice-parties, .alvarez-invoice .invoice-totals, .alvarez-invoice footer { break-inside: avoid; }
        .alvarez-invoice thead { display: table-header-group; }
      }
    `}</style>

    <header>
      <div className="invoice-brand">
        {/* Local print assets bypass image optimization for reliable printing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logoUrl && <img src={logoUrl} alt={`Logo de ${name}`} width={120} height={90} />}
        <div>
          <h1>{name}</h1>
          {addressLines.map(line => <p key={line}>{line}</p>)}
        </div>
      </div>
      <div className="invoice-reference">
        <h2>Factura de servicios</h2>
        <p>Rastreo <strong>{shipment.tracking_code || shipment.id}</strong></p>
        <p>Emitida: {date}</p>
        {shipment.package_number != null && <p>Paquete: {packageNumber(shipment.package_number)}</p>}
      </div>
    </header>

    <section className="invoice-parties">
      <div>
        <h2>Destinatario</h2>
        <p><strong>{shipment.recipient_name || "Sin especificar"}</strong></p>
        {shipment.recipient_address && <p>{shipment.recipient_address}</p>}
        {shipment.location && <p>{shipment.location}</p>}
        {shipment.recipient_phone && <p>{shipment.recipient_phone}</p>}
      </div>
      <div>
        <h2>Remitente</h2>
        <p><strong>{shipment.sender_name || "Sin especificar"}</strong></p>
        {shipment.sender_phone && <p>{shipment.sender_phone}</p>}
      </div>
    </section>

    <p className="invoice-context"><strong>{operation}</strong> · Importes en USD</p>
    <table aria-label="Detalle de servicios y productos">
      <thead><tr><th>Cantidad</th><th>Descripción</th><th className="number">Precio</th><th className="number">Total</th></tr></thead>
      <tbody>
        {rows.map((item, index) => <tr key={item.id ?? index}>
          <td>{item.item_type === "MONEY" ? 1 : item.quantity} {item.item_type !== "MONEY" && item.unit}</td>
          <td>{item.description}</td>
          <td className="number">{amount(item.item_type === "MONEY" ? item.total : item.unit_price)}</td>
          <td className="number">{amount(item.total)}</td>
        </tr>)}
        {shipment.store_products?.map(item => <tr key={remittanceItemKey(item)}>
          <td>{item.quantity}</td><td>{item.name}</td>
          <td className="number">{amount(item.unit_price)}</td>
          <td className="number">{amount(item.quantity * item.unit_price)}</td>
        </tr>)}
        {shipment.physical_products?.map(item => <tr key={`physical:${item.product_id}`}>
          <td>{item.quantity}</td><td>{item.name} · Tienda física Hialeah</td>
          <td className="number">{amount(item.unit_price)}</td>
          <td className="number">{amount(item.quantity * item.unit_price)}</td>
        </tr>)}
        {shipment.contains_package && !!shipment.package_contents?.length && <>
          <tr><th colSpan={4}>Contenido declarado del paquete</th></tr>
          {shipment.package_contents.map((item, index) => <tr key={index}><td>{item.quantity}</td><td colSpan={3}>{item.description}</td></tr>)}
        </>}
      </tbody>
    </table>

    <section className="invoice-summary">
      <div>
        {shipment.contains_money && shipment.money_amount > 0 && <>
          <p><strong>Dinero a entregar: {deliveryLabel(shipment)}</strong></p>
          {shipment.money_delivery_currency && shipment.money_delivery_currency !== "USD" &&
            <p>Cambio manual: 1 USD = {shipment.money_exchange_rate} CUP</p>}
        </>}
        {shipment.notes?.trim() && <p className="invoice-notes"><strong>Observaciones:</strong> {shipment.notes.trim()}</p>}
      </div>
      <dl className="invoice-totals">
        {shipment.money_discount > 0 && <div><dt>Rebaja en comisión incluida</dt><dd>{amount(shipment.money_discount)}</dd></div>}
        <div><dt><strong>Total de la factura</strong></dt><dd><strong>{amount(shipment.service_price)}</strong></dd></div>
        <div><dt>Monto pagado</dt><dd>{amount(shipment.amount_paid)}</dd></div>
        <div className="invoice-balance"><dt>Saldo pendiente</dt><dd>{amount(shipment.balance_due)}</dd></div>
      </dl>
    </section>

    <footer><p>Firma del cliente</p><p>Firma del empleado</p></footer>
    {website && <p className="invoice-website">{website}</p>}
  </article>;
}
