"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  ImageIcon,
  Loader2,
  Play,
  RefreshCw,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type ImageKind = "product" | "combo" | "banner" | "logo" | "generic";

type Candidate = {
  key: string;
  table: string;
  id: string;
  column: string;
  url: string;
  kind: ImageKind;
  storagePathColumn?: string;
};

type ItemResult = {
  candidate: Candidate;
  ok: boolean;
  error?: string;
  originalBytes?: number;
  optimizedBytes?: number;
  savedBytes?: number;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 KB";

  const units = ["B", "KB", "MB", "GB"];
  let current = value;
  let index = 0;

  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index++;
  }

  return `${current.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function callMaintenance(body: Record<string, unknown>) {
  const token = await getToken();

  const response = await fetch("/api/admin/image-maintenance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(result.error || "La operación no pudo completarse.");
  }

  return result;
}

export default function ImageMaintenancePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ItemResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [limit, setLimit] = useState(250);
  const [processed, setProcessed] = useState(0);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);

  const successful = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);

  const totals = useMemo(() => {
    return successful.reduce(
      (acc, item) => {
        acc.original += item.originalBytes || 0;
        acc.optimized += item.optimizedBytes || 0;
        acc.saved += item.savedBytes || 0;
        return acc;
      },
      { original: 0, optimized: 0, saved: 0 }
    );
  }, [successful]);

  async function scan() {
    setScanning(true);
    setMessage("");
    setWarnings([]);
    setResults([]);
    setProcessed(0);

    try {
      const result = await callMaintenance({
        action: "scan",
        limit,
      });

      setCandidates(result.candidates || []);
      setWarnings(result.warnings || []);

      setMessage(
        result.candidates?.length
          ? `${result.candidates.length} imagen(es) antigua(s) listas para revisar.`
          : "No se encontraron imágenes antiguas pendientes."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo escanear.");
    } finally {
      setScanning(false);
    }
  }

  async function runMigration() {
    if (!candidates.length || running) return;

    const confirmed = window.confirm(
      deleteOriginals
        ? "Se optimizarán las imágenes y se eliminarán los archivos originales después de actualizar correctamente la base de datos. ¿Continuar?"
        : "Se crearán versiones WebP y se conservarán los archivos originales. ¿Continuar?"
    );

    if (!confirmed) return;

    setRunning(true);
    setMessage("");
    setResults([]);
    setProcessed(0);

    const completed: ItemResult[] = [];

    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];

      try {
        const response = await callMaintenance({
          action: "optimize",
          candidate,
          deleteOriginal: deleteOriginals,
        });

        completed.push({
          candidate,
          ok: true,
          originalBytes: response.result.originalBytes,
          optimizedBytes: response.result.optimizedBytes,
          savedBytes: response.result.savedBytes,
        });
      } catch (error) {
        completed.push({
          candidate,
          ok: false,
          error:
            error instanceof Error ? error.message : "No se pudo optimizar.",
        });
      }

      setResults([...completed]);
      setProcessed(index + 1);
    }

    setCandidates([]);
    setRunning(false);
    setMessage(
      `Proceso terminado: ${completed.filter((item) => item.ok).length} correctas y ${
        completed.filter((item) => !item.ok).length
      } con error.`
    );
  }

  const progress =
    candidates.length > 0
      ? Math.round((processed / candidates.length) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-3xl bg-gradient-to-r from-[#061b3a] to-[#174ea6] p-6 text-white shadow-lg md:p-8">
          <p className="text-sm font-bold text-blue-200">
            Mantenimiento Super Admin
          </p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">
            Optimizar imágenes antiguas
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100 md:text-base">
            Convierte imágenes existentes a WebP, reduce sus dimensiones y
            actualiza automáticamente las URLs guardadas en Supabase.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Metric
            icon={<ImageIcon size={20} />}
            label="Pendientes"
            value={candidates.length.toString()}
          />
          <Metric
            icon={<CheckCircle2 size={20} />}
            label="Optimizadas"
            value={successful.length.toString()}
          />
          <Metric
            icon={<AlertTriangle size={20} />}
            label="Errores"
            value={failed.length.toString()}
          />
          <Metric
            icon={<HardDrive size={20} />}
            label="Ahorro"
            value={formatBytes(totals.saved)}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-black text-slate-800">
                Cantidad máxima por lote
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(event) =>
                  setLimit(
                    Math.min(
                      Math.max(Number(event.target.value || 1), 1),
                      1000
                    )
                  )
                }
                disabled={running || scanning}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                Comienza con 50 o 100 para hacer una prueba controlada.
              </p>
            </div>

            <label className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <input
                type="checkbox"
                checked={deleteOriginals}
                onChange={(event) => setDeleteOriginals(event.target.checked)}
                disabled={running}
                className="mt-1 h-5 w-5"
              />
              <span>
                <span className="block font-black text-amber-900">
                  Eliminar originales después de migrar
                </span>
                <span className="mt-1 block text-sm text-amber-800">
                  Déjalo desactivado en la primera prueba. La versión segura
                  conserva los archivos originales.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={scan}
              disabled={running || scanning}
              className="flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-5 py-4 font-black text-slate-900 disabled:opacity-50"
            >
              {scanning ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <RefreshCw size={20} />
              )}
              Escanear imágenes
            </button>

            <button
              type="button"
              onClick={runMigration}
              disabled={running || candidates.length === 0}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-4 font-black text-white disabled:opacity-50"
            >
              {running ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Play size={20} />
              )}
              Optimizar {candidates.length} imagen(es)
            </button>
          </div>

          {(running || processed > 0) && (
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm font-bold">
                <span>
                  Procesadas: {processed} / {candidates.length || processed}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {message && (
            <div className="mt-5 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
              {message}
            </div>
          )}

          {warnings.length > 0 && (
            <details className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <summary className="cursor-pointer font-black">
                Avisos del escaneo ({warnings.length})
              </summary>
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {results.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-xl font-black text-slate-900">
              Resultado del lote
            </h2>

            <div className="mt-4 max-h-[520px] space-y-2 overflow-auto">
              {results.map((item) => (
                <div
                  key={item.candidate.key}
                  className={`rounded-2xl border p-4 text-sm ${
                    item.ok
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black">
                        {item.candidate.table}.{item.candidate.column}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {item.candidate.url}
                      </p>
                    </div>
                    <span className="font-black">
                      {item.ok ? "Correcta" : "Error"}
                    </span>
                  </div>

                  {item.ok ? (
                    <p className="mt-2 font-bold text-green-800">
                      {formatBytes(item.originalBytes || 0)} →{" "}
                      {formatBytes(item.optimizedBytes || 0)} · ahorro{" "}
                      {formatBytes(item.savedBytes || 0)}
                    </p>
                  ) : (
                    <p className="mt-2 font-bold text-red-700">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
