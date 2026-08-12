"use client";

/* =========================================================
   PHONE COUNTRY FIELD
   ---------------------------------------------------------
   Selector de país (bandera + código de marcado) pegado a un
   input de teléfono. Al elegir el país se antepone su código
   automáticamente (+34, +52, etc.) y se valida la cantidad de
   dígitos esperada para ese país — así no se repite lo que
   pasó con el cliente de España cuyo teléfono no se sabía de
   dónde era.

   El valor final que se emite hacia el formulario (onChange,
   name="phone") es un solo string: "+34 612345678". Eso no
   rompe nada de lo que ya existe (form.phone sigue siendo un
   string plano), solo cambia cómo se arma.
========================================================= */

import { useEffect, useState } from "react";

import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, findPhoneCountry, type PhoneCountry } from "@/lib/constants/phone-countries";
import FlagIcon from "@/components/tienda/FlagIcon";

type PhoneCountryFieldProps = {
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
};

function splitPhone(fullValue: string): { country: PhoneCountry; nationalNumber: string } {
  const trimmed = fullValue.trim();

  const match = PHONE_COUNTRIES.find((c) => trimmed.startsWith(c.dialCode));
  if (match) {
    return { country: match, nationalNumber: trimmed.slice(match.dialCode.length).trim() };
  }

  return { country: DEFAULT_PHONE_COUNTRY, nationalNumber: trimmed };
}

export default function PhoneCountryField({
  name,
  value,
  onChange,
  placeholder = "Teléfono *",
  className,
  required,
}: PhoneCountryFieldProps) {
  const [country, setCountry] = useState<PhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [nationalNumber, setNationalNumber] = useState("");
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  // Solo se sincroniza desde afuera una vez (ej. si el form ya trae un
  // valor precargado). Después de eso el componente maneja su propio
  // estado para no pelear con lo que el usuario está escribiendo.
  useEffect(() => {
    if (!value) return;
    const { country: parsedCountry, nationalNumber: parsedNumber } = splitPhone(value);
    setCountry(parsedCountry);
    setNationalNumber(parsedNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit(nextCountry: PhoneCountry, nextNumber: string) {
    const combined = nextNumber ? `${nextCountry.dialCode} ${nextNumber}` : "";
    onChange({ target: { name, value: combined } } as React.ChangeEvent<HTMLInputElement>);
  }

  function handleCountrySelect(nextCountry: PhoneCountry) {
    setCountry(nextCountry);
    setOpen(false);
    emit(nextCountry, nationalNumber);
  }

  function handleNumberChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digitsOnly = event.target.value.replace(/[^\d\s-]/g, "");
    setNationalNumber(digitsOnly);
    emit(country, digitsOnly);
  }

  const rawDigitCount = nationalNumber.replace(/\D/g, "").length;
  const looksIncomplete = touched && rawDigitCount > 0 && rawDigitCount !== country.digits;

  return (
    <div className={className ?? "md:col-span-2"}>
      <div
        className={`flex w-full min-w-0 items-stretch overflow-hidden rounded-xl border bg-white transition focus-within:border-black ${
          looksIncomplete ? "border-amber-400" : "border-gray-300"
        }`}
      >
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Elegir país"
            aria-expanded={open}
            className="flex h-full items-center gap-1.5 border-r border-gray-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <FlagIcon countryCode={country.iso2} size={18} />
            <span>{country.dialCode}</span>
          </button>

          {open && (
            <>
              <button
                type="button"
                aria-label="Cerrar selector de país"
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[80] cursor-default"
              />

              <div className="absolute left-0 top-full z-[90] mt-2 w-56 overflow-hidden rounded-2xl bg-white py-1 shadow-xl ring-1 ring-black/5">
                {PHONE_COUNTRIES.map((c) => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => handleCountrySelect(c)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold transition hover:bg-slate-50 ${
                      c.iso2 === country.iso2 ? "bg-slate-50 text-[#061b3a]" : "text-slate-600"
                    }`}
                  >
                    <FlagIcon countryCode={c.iso2} size={18} />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 text-slate-400">{c.dialCode}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <input
          name={name}
          type="tel"
          inputMode="tel"
          placeholder={placeholder}
          value={nationalNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          required={required}
          className="w-full min-w-0 flex-1 px-4 py-3 outline-none"
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
