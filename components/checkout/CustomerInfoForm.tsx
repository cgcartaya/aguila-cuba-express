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
    <div className="min-w-0 overflow-hidden rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex min-w-0 items-start gap-2 text-lg font-bold leading-tight text-gray-900">
        <UserRound className="mt-0.5 shrink-0" size={20} />
        <span className="min-w-0">Información del cliente</span>
      </h2>

      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="name"
          placeholder="Nombre completo *"
          value={form.name}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="email"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black"
        />

        <input
          name="phone"
          placeholder="Teléfono *"
          value={form.phone}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border px-4 py-3 outline-none focus:border-black md:col-span-2"
        />
      </div>
    </div>
  );
}
