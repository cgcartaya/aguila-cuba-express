import { MapPin } from "lucide-react";
import type { CheckoutForm } from "./types";

type Props = {
  form: CheckoutForm;
  showNotes?: boolean;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
};

export function LocalDeliveryAddressForm({
  form,
  showNotes = true,
  onChange,
}: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
        <MapPin size={20} />
        Dirección de entrega
      </h2>
      <p className="mb-5 text-sm text-gray-500">
        Escribe la dirección donde deseas recibir el pedido.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="city"
          placeholder="Ciudad *"
          value={form.city}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <input
          name="reference"
          placeholder="Referencia (opcional)"
          value={form.reference}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <textarea
          name="exact_address"
          placeholder="Dirección completa *"
          value={form.exact_address}
          onChange={onChange}
          rows={4}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2"
        />

        {showNotes && (
          <textarea
            name="notes"
            placeholder="Notas para la entrega (opcional)"
            value={form.notes}
            onChange={onChange}
            rows={4}
            className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 md:col-span-2"
          />
        )}
      </div>
    </div>
  );
}
