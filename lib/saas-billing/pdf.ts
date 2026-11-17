import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { jsPDF } from "jspdf";
import {
  balance,
  dateText,
  invoiceState,
  money,
  statusText,
  type Invoice,
} from "./model";

export async function invoicePdf(i: Invoice) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const navy = "#0B1F4D";
  pdf.setFillColor(navy);
  pdf.rect(0, 0, 612, 126, "F");
  // Same configurable original logo used by Perla's public identity.
  try {
    const logo = await readFile(
      path.join(process.cwd(), "public/perla/perla-shell.png"),
    );
    pdf.addImage(logo.toString("base64"), "PNG", 40, 28, 64, 64);
  } catch {
    /* The wordmark remains legible if the original asset is unavailable. */
  }
  pdf.setTextColor("#FFFFFF");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(21);
  pdf.text("PERLA MARKETPLACE", 118, 56);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text("Factura de suscripción SaaS", 118, 79);
  pdf.setTextColor(navy);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(i.number || "BORRADOR - SIN EMITIR", 40, 164);
  let y = 190;
  function line(label: string, value: string, size = 10) {
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(value || "—", 370);
    if (y + lines.length * 13 > 700) {
      pdf.addPage("letter");
      y = 60;
    }
    pdf.setFont("helvetica", "bold");
    pdf.text(label, 40, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(lines, 180, y);
    y += Math.max(20, lines.length * 13 + 7);
  }
  line("Fecha de emisión", dateText(i.issued_on));
  line("Vencimiento", dateText(i.due_on));
  line("Estado", statusText[invoiceState(i)]);
  y += 10;
  line("Emisor", i.issuer.name);
  if (i.issuer.address) line("Dirección", i.issuer.address);
  if (i.issuer.tax_id) line("Identificación fiscal", i.issuer.tax_id);
  if (i.issuer.email) line("Correo del emisor", i.issuer.email);
  if (i.issuer.phone) line("Teléfono del emisor", i.issuer.phone);
  y += 10;
  line("Cliente", i.client_name);
  line("Negocio", i.store_name);
  if (i.email) line("Correo", i.email);
  if (i.phone) line("WhatsApp", i.phone);
  line("Período", i.period);
  line("Servicio", i.description);
  // Long issuer/service information is allowed to continue on another letter page.
  if (y > 570) {
    pdf.addPage("letter");
    y = 60;
  }
  y += 12;
  pdf.setDrawColor("#DFE5EF");
  pdf.line(40, y, 572, y);
  y += 25;
  line("Subtotal", money(i.subtotal));
  if (Number(i.discount)) line("Descuento", `-${money(i.discount)}`);
  if (Number(i.adjustment)) line("Ajuste", money(i.adjustment));
  if (Number(i.tax)) line("Impuestos configurados", money(i.tax));
  line("TOTAL USD", money(i.total), 14);
  line("Pagado", money(i.paid));
  line("Saldo pendiente", money(balance(i)), 12);
  if (y > 690) {
    pdf.addPage("letter");
    y = 60;
  }
  y += 22;
  pdf.setTextColor("#526078");
  pdf.setFontSize(10);
  pdf.text(
    pdf.splitTextToSize(
      "Gracias por confiar en Perla Marketplace. Seguimos trabajando para ofrecerte una plataforma estable, moderna y adaptada a las necesidades de tu negocio.",
      532,
    ),
    40,
    y,
  );
  return Buffer.from(pdf.output("arraybuffer"));
}
