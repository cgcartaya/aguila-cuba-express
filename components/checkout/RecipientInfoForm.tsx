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
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <Phone size={20} />
        Persona que recibe en Cuba
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="recipient_name"
          placeholder="Nombre del destinatario *"
          value={form.recipient_name}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="recipient_phone"
          placeholder="Teléfono principal *"
          value={form.recipient_phone}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="recipient_phone_alt"
          placeholder="Teléfono alternativo"
          value={form.recipient_phone_alt}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
        />
      </div>

      <p className="mt-3 text-sm text-gray-500">
        Estos datos son de la persona que recibirá el pedido en Cuba.
      </p>
    </div>
  );
}