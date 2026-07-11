"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function TrackingSearch({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");

    if (!normalized) {
      setError("Escribe el código de rastreo.");
      return;
    }

    setError("");
    router.push(`/rastrear/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 sm:flex-row">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Ejemplo: ACE-7K4P92AB"
          autoCapitalize="characters"
          autoComplete="off"
          className="min-h-14 flex-1 rounded-2xl px-4 text-base font-semibold uppercase outline-none ring-red-600 transition focus:ring-2"
          aria-label="Código de rastreo"
        />
        <button
          type="submit"
          className="min-h-14 rounded-2xl bg-red-600 px-7 font-bold text-white transition hover:bg-red-700 active:scale-[0.99]"
        >
          Rastrear envío
        </button>
      </div>
      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
    </form>
  );
}
