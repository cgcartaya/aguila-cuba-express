import { Phone } from "lucide-react";
import type { CheckoutForm } from "./types";

type Props = {
  form: CheckoutForm;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export function RecipientInfoForm({ form, onChange }: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex min-w-0 items-start gap-2 text-lg font-bold leading-tight text-gray-900">
        <Phone className="mt-0.5 shrink-0" size={20} />
        <span className="min-w-0">Persona que recibe en Cuba</span>
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="recipient_name"
          placeholder="Nombre del destinatario *"
          value={form.recipient_name}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="recipient_phone"
          placeholder="Teléfono principal *"
          value={form.recipient_phone}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="recipient_phone_alt"
          placeholder="Teléfono alternativo"
          value={form.recipient_phone_alt}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
        />
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Estos datos son de la persona que recibirá el pedido en Cuba.
      </p>
    </div>
  );
}
