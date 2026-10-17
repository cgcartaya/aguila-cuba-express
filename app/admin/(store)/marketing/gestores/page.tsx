"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { shareappApi, type Member, type Result } from "@/lib/shareapp/client";
import AccountCreator from "@/components/shareapp/AccountCreator";
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
  const [email, setEmail] = useState("");
  const [activationLink, setActivationLink] = useState("");
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
      <AccountCreator storeId={storeId} onCreated={refresh} />
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-bold">Invitar gestor existente</h2>
        <p className="text-sm text-slate-500">
          Para una persona que ya tiene cuenta. La invitación queda vinculada al
          correo indicado, caduca en 7 días y se acepta una sola vez. No cambia
          su contraseña.
        </p>
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              await shareappApi("members", {
                storeId,
                displayName: name,
                email,
              });
              setName("");
              setEmail("");
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
          <input
            aria-label="Correo del gestor existente"
            className="min-w-0 flex-1 rounded-xl border p-3"
            placeholder="Correo de su cuenta"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            disabled={busy || !name.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            Crear invitación
          </button>
        </form>
        {activationLink && (
          <div className="space-y-2 rounded-xl bg-indigo-50 p-4">
            <p className="text-sm">
              Nuevo enlace de activación. El anterior deja de funcionar.
            </p>
            <input
              className="w-full rounded-lg border p-2 text-sm"
              readOnly
              value={activationLink}
              aria-label="Nuevo enlace de activación"
            />
            <button
              className="rounded-lg border bg-white px-3 py-2"
              onClick={() => {
                void navigator.clipboard
                  .writeText(activationLink)
                  .then(() => setNotice("Enlace copiado."))
                  .catch(() => setError("Copia el enlace manualmente."));
              }}
            >
              Copiar enlace
            </button>
          </div>
        )}
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
                  {m.password_pending
                    ? "Pendiente de definir contraseña"
                    : m.user_id
                      ? "Cuenta vinculada"
                      : "Invitación pendiente"}
                </p>
                {m.email && (
                  <p className="break-all text-sm text-slate-500">{m.email}</p>
                )}
                {m.invite_code && (
                  <p className="text-xs text-slate-500">
                    Vence: {new Date(m.invite_expires_at!).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {m.password_pending && (
                  <button
                    disabled={busy || !m.active}
                    className="rounded-lg border px-3 py-2 text-sm"
                    onClick={() =>
                      void action(async () => {
                        const result = await shareappApi<{
                          activationUrl: string;
                        }>("accounts", { storeId, memberId: m.id });
                        setActivationLink(result.activationUrl);
                      })
                    }
                  >
                    Generar enlace de activación
                  </button>
                )}
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
