/** Print only the React-rendered receipt, with natural pagination on US Letter. */
export function printLymReceipt() {
  const receipt = document.getElementById("lym-receipt");
  if (!receipt) return;
  const frame = document.createElement("iframe");
  frame.title = "Comprobante LYM";
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;";
  frame.onload = () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) {
      frame.remove();
      return;
    }
    printWindow.onafterprint = () => frame.remove();
    printWindow.focus();
    printWindow.print();
  };
  // innerHTML is produced by React's escaped text rendering, never raw user HTML.
  frame.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Comprobante LYM</title><style>@page{size:letter;margin:14mm}body{font:12px Arial,sans-serif;color:#000}h2{font-size:22px}p{line-height:1.5;margin:12px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 4px;border-bottom:1px solid #ccc}thead{display:table-header-group}tr{break-inside:avoid}.font-bold,.font-black{font-weight:bold}.border-2{border:2px solid #000;padding:10px}.text-right{text-align:right}.text-xl{font-size:18px}</style></head><body>${receipt.innerHTML}</body></html>`;
  document.body.appendChild(frame);
}
