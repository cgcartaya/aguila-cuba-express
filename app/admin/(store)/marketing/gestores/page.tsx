"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { shareappApi, type Member, type Result } from "@/lib/shareapp/client";
import Results from "@/components/shareapp/Results";

export default function GestoresAdminPage() {
  const { loading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const storeId = (isSuperAdmin ? selectedStore || accessStore : accessStore)
    ?.id;
  if (loading) return <main className="p-8">Verificando acceso…</main>;
  if (!storeId) return <main className="p-8">Selecciona una tienda.</main>;
  return <GestoresPanel key={storeId} storeId={storeId} />;
}

function GestoresPanel({ storeId }: { storeId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [rows, setRows] = useState<Result[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState(7);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!storeId) return;
    const [data, stats] = await Promise.all([
      shareappApi<{
        members: Member[];
        settings: { enabled: boolean; attribution_days: number };
      }>(`members?storeId=${storeId}`),
      shareappApi<{ results: Result[] }>(
        `results?storeId=${storeId}&scope=store`,
      ),
    ]);
    setMembers(data.members);
    setEnabled(data.settings.enabled);
    setDays(data.settings.attribution_days);
    setRows(stats.results);
  }, [storeId]);
  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(() => refresh())
      .catch((e) => setError(e.message));
  }, [refresh]);
  async function action(work: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
      await refresh();
      setNotice("Cambios guardados.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error guardando.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-7 p-4 text-slate-900 md:p-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">
          Perla Marketplace · ShareAPP
        </p>
        <h1 className="mt-2 text-3xl font-black">Tu equipo de gestores</h1>
        <p className="mt-2 text-slate-500">
          Autoriza quién promociona tu tienda y consulta los resultados de sus
          enlaces.
        </p>
        <Link
          className="mt-3 inline-block font-bold text-indigo-600 underline"
          href="/gestores"
        >
          Abrir portal del gestor →
        </Link>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 text-emerald-800"
        >
          {notice}
        </p>
      )}
      <form
        className="flex flex-wrap items-end gap-4 rounded-2xl border bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void action(() =>
            shareappApi(
              "members",
              { storeId, enabled, attributionDays: days },
              "PATCH",
            ),
          );
        }}
      >
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Habilitar ShareAPP en esta tienda
        </label>
        <label className="text-sm">
          Plazo de atribución (días)
          <input
            className="ml-3 w-20 rounded-lg border p-2"
            type="number"
            min="1"
            max="30"
            required
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <button
          disabled={busy}
          className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          Guardar configuración
        </button>
        <p className="w-full text-sm text-slate-500">
          Se acredita el último enlace de gestor abierto para esta tienda dentro
          del plazo. Desactivar el módulo detiene enlaces y nuevas atribuciones.
        </p>
      </form>
      <Results rows={rows} />
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">Invitar un gestor</h2>
        <p className="text-sm text-slate-500">
          Genera un enlace privado y envíaselo tú al gestor. Caduca en 7 días y
          se usa una sola vez. El gestor entra con una cuenta de Perla; no
          recibe acceso administrativo.
        </p>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await shareappApi("members", { storeId, displayName: name });
              setName("");
            });
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-xl border p-3"
            aria-label="Nombre del gestor"
            placeholder="Nombre del gestor"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            disabled={busy || !name.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            Crear invitación
          </button>
        </form>
        <div className="divide-y">
          {members.map((m) => (
            <article
              className="flex flex-wrap items-center justify-between gap-3 py-4"
              key={m.id}
            >
              <div>
                <p className="font-bold">{m.display_name}</p>
                <p className="text-sm text-slate-500">
                  {m.active ? "Activo" : "Desactivado"} ·{" "}
                  {m.user_id ? "Cuenta vinculada" : "Invitación pendiente"}
                </p>
                {m.invite_code && (
                  <p className="text-xs text-slate-500">
                    Vence: {new Date(m.invite_expires_at!).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {m.invite_code && (
                  <button
                    className="rounded-lg border px-3 py-2 text-sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/gestores?invite=${m.invite_code}`,
                        );
                        setNotice(
                          "Invitación copiada. Compártela solo con el gestor.",
                        );
                      } catch {
                        setError(
                          "No se pudo copiar la invitación. Comprueba el permiso del portapapeles.",
                        );
                      }
                    }}
                  >
                    Copiar invitación
                  </button>
                )}
                <button
                  disabled={busy}
                  className="rounded-lg border px-3 py-2 text-sm"
                  onClick={() =>
                    void action(() =>
                      shareappApi(
                        "members",
                        { storeId, memberId: m.id, active: !m.active },
                        "PATCH",
                      ),
                    )
                  }
                >
                  {m.active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!members.length && (
          <p className="py-4 text-center text-slate-500">
            Todavía no hay gestores en esta tienda.
          </p>
        )}
      </section>
    </main>
  );
}
