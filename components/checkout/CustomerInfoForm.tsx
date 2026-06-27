import { UserRound } from "lucide-react";
import type { CheckoutForm } from "./types";

type Props = {
  form: CheckoutForm;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export function CustomerInfoForm({ form, onChange }: Props) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">
        <UserRound size={20} />
        Información del cliente
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="name"
          placeholder="Nombre completo *"
          value={form.name}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="email"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="phone"
          placeholder="Teléfono *"
          value={form.phone}
          onChange={onChange}
          className="rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
        />
      </div>
    </div>
  );
}