import { packageNumber, type PackageContentItem } from '@/lib/shipping/package-label';

export default function PackageContentsList({ items, number }: { items?: PackageContentItem[]; number?: number | string | null }) {
  if (!items?.length) return null;
  return <section className="package-contents-list mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950">
    <div className="border-b border-slate-200 px-5 py-3"><h2 className="text-lg font-black">Contenido del paquete</h2>{number != null && <p className="text-sm text-slate-500">{packageNumber(number)}</p>}</div>
    <table className="w-full border-collapse text-left text-sm"><thead className="bg-slate-50"><tr><th className="w-20 px-5 py-2">Cantidad</th><th className="px-5 py-2">Descripción</th></tr></thead>
      <tbody>{items.map((item, index) => <tr key={index} className="break-inside-avoid border-t border-slate-100"><td className="px-5 py-2 font-bold">{item.quantity}</td><td className="break-words px-5 py-2">{item.description}</td></tr>)}</tbody>
    </table>
  </section>;
}
