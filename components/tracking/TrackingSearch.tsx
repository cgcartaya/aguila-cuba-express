"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PREFIX = "ACE-";

function extractSuffix(value: string) {
  let normalized = value.trim().toUpperCase();

  try {
    if (normalized.startsWith("HTTP://") || normalized.startsWith("HTTPS://")) {
      const parsed = new URL(normalized);
      normalized = decodeURIComponent(
        parsed.pathname.split("/").filter(Boolean).at(-1) ?? ""
      ).toUpperCase();
    }
  } catch {
    // Si no es una URL válida, continuamos tratándolo como código normal.
  }

  normalized = normalized
    .replace(/\s+/g, "")
    .replace(/^ACE-?/, "")
    .replace(/[^A-Z0-9]/g, "");

  return normalized.slice(0, 8);
}

export default function TrackingSearch({
  initialCode = "",
}: {
  initialCode?: string;
}) {
  const router = useRouter();
  const [suffix, setSuffix] = useState(() => extractSuffix(initialCode));
  const [error, setError] = useState("");

  const fullCode = useMemo(
    () => `${PREFIX}${suffix}`,
    [suffix]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!suffix) {
      setError("Escribe los 8 caracteres de tu código.");
      return;
    }

    if (suffix.length !== 8) {
      setError("El código debe tener 8 caracteres después de ACE-.");
      return;
    }

    setError("");
    router.push(`/rastrear/${encodeURIComponent(fullCode)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-2xl">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex min-h-14 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
            <span className="flex items-center border-r border-slate-200 bg-slate-100 px-4 font-black tracking-wide text-[#062446]">
              ACE-
            </span>

            <input
              value={suffix}
              onChange={(event) => {
                setSuffix(extractSuffix(event.target.value));
                setError("");
              }}
              placeholder="70F9F815"
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
              maxLength={8}
              className="min-w-0 flex-1 bg-transparent px-4 text-base font-bold uppercase tracking-wider outline-none"
              aria-label="Últimos 8 caracteres del código de rastreo"
            />
          </div>

          <button
            type="submit"
            className="min-h-14 rounded-2xl bg-red-600 px-7 font-bold text-white transition hover:bg-red-700 active:scale-[0.99]"
          >
            Rastrear envío
          </button>
        </div>

        <p className="mt-3 px-1 text-left text-sm text-slate-500">
          Escribe solamente los 8 caracteres que aparecen después de <strong>ACE-</strong>.
        </p>
      </div>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}
    </form>
  );
}
