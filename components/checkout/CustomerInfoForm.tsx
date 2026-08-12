import { UserRound } from "lucide-react";
import type { CheckoutForm } from "./types";
import PhoneCountryField from "@/components/checkout/PhoneCountryField";

type Props = {
  form: CheckoutForm;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
};

export function CustomerInfoForm({ form, onChange }: Props) {
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.06)] sm:p-6">
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
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <input
          name="email"
          type="email"
          placeholder="Email *"
          value={form.email}
          onChange={onChange}
          className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        />

        <PhoneCountryField
          name="phone"
          value={form.phone}
          onChange={onChange}
          placeholder="Teléfono *"
          required
        />
      </div>
    </div>
  );
}
