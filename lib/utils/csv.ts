/* =========================================================
   CSV EXPORT — utilidad compartida

   Genera y descarga un CSV desde el navegador, sin depender de
   ninguna librería. Escapa comillas y comas correctamente, y
   antepone un BOM para que Excel abra los acentos (ñ, á, é...)
   sin que se vean rotos — el problema clásico de CSV + Excel en
   español.
========================================================= */

function escapeCsvValue(value: unknown): string {
  const stringValue = value == null ? "" : String(value);

  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];

  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
