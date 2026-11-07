"use client";

/* =========================================================
   PHONE COUNTRY FIELD
   ---------------------------------------------------------
   Selector de país (bandera + código de marcado) pegado a un
   input de teléfono. Al elegir el país se antepone su código
   automáticamente (+34, +52, etc.) y se valida la cantidad de
   dígitos esperada para ese país.

   NOTA TÉCNICA: se usa un <select> nativo del navegador (no
   un desplegable armado a mano con posicionamiento absoluto),
   a propósito, para que funcione garantizado en cualquier
   navegador/dispositivo sin depender de z-index ni overflow
   de contenedores padres.

   El valor final que se emite hacia el formulario (onChange,
   name="phone") es un solo string: "+34 612345678". Eso no
   rompe nada de lo que ya existe (form.phone sigue siendo un
   string plano), solo cambia cómo se arma.
========================================================= */

import { useState } from "react";

import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, findPhoneCountry, type PhoneCountry } from "@/lib/constants/phone-countries";
import { splitPhone } from "@/lib/utils/store-whatsapp";
import FlagIcon from "@/components/tienda/FlagIcon";

type PhoneCountryFieldProps = {
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

export default function PhoneCountryField({
  name,
  value,
  onChange,
  placeholder = "Teléfono *",
  className,
  required,
}: PhoneCountryFieldProps) {
  const [preferredCountry, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [touched, setTouched] = useState(false);
  // Derive the visible national number from the controlled form value.
  // Country state only remembers the user's selection, including empty fields.
  const { country, nationalNumber } = splitPhone(value || "", preferredCountry);

  function emit(nextCountry: PhoneCountry, nextNumber: string) {
    const combined = nextNumber ? `${nextCountry.dialCode} ${nextNumber}` : "";
    onChange({ target: { name, value: combined } } as React.ChangeEvent<HTMLInputElement>);
  }

  function handleCountryChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextCountry = findPhoneCountry(event.target.value);
    setCountry(nextCountry);
    emit(nextCountry, nationalNumber);
  }

  function handleNumberChange(event: React.ChangeEvent<HTMLInputElement>) {
    const parsed = splitPhone(event.target.value, country);
    setCountry(parsed.country);
    emit(parsed.country, parsed.nationalNumber);
  }

  const rawDigitCount = nationalNumber.replace(/\D/g, "").length;
  const looksIncomplete = touched && rawDigitCount > 0 && rawDigitCount !== country.digits;

  return (
    <div className={className ?? "md:col-span-2"}>
      <div
        className={`flex w-full min-w-0 items-stretch rounded-xl border bg-white transition focus-within:border-black ${
          looksIncomplete ? "border-amber-400" : "border-gray-300"
        }`}
      >
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-l-xl border-r border-gray-200 bg-slate-50 px-2.5 py-3">
          <FlagIcon countryCode={country.iso2} size={18} />
          <select
            value={country.iso2}
            onChange={handleCountryChange}
            aria-label="País del teléfono"
            className="w-auto max-w-[4.5rem] bg-transparent text-sm font-bold text-slate-700 outline-none"
          >
            {PHONE_COUNTRIES.map((c) => (
              <option key={c.iso2} value={c.iso2} title={c.name}>
                {c.dialCode} {c.iso2.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <input
          name={name}
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          required={required}
          className="w-full min-w-0 flex-1 rounded-r-xl px-4 py-3 outline-none"
        />
      </div>

      {looksIncomplete && (
        <p className="mt-1 text-xs font-semibold text-amber-600">
          Revisa el número: para {country.name} suele tener {country.digits} dígitos.
        </p>
      )}
    </div>
  );
}
