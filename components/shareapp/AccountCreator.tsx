"use client";
import { useState } from "react";
import { shareappApi } from "@/lib/shareapp/client";
export default function AccountCreator({
  storeId,
  onCreated,
}: {
  storeId: string;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState("activation");
  const [password, setPassword] = useState("");
  const [link, setLink] = useState("");
  const [createdEmail, setCreatedEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  return (
    <section className="space-y-4 rounded-2xl border border-indigo-200 bg-white p-5">
      <h2 className="text-xl font-bold">Crear cuenta de gestor</h2>
      <p className="text-sm text-slate-500">
        Crea un acceso propio para ShareAPP. El gestor podrá entrar con correo y
        contraseña, sin permisos administrativos.
      </p>
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setLink("");
          setCopied(false);
          try {
            const result = await shareappApi<{
              activationUrl: string;
              email: string;
            }>("accounts", {
              storeId,
              displayName: name,
              email,
              mode,
              temporaryPassword: mode === "temporary" ? password : undefined,
            });
            setLink(result.activationUrl);
            setCreatedEmail(result.email);
            setPassword("");
            setName("");
            setEmail("");
            await onCreated();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "No se pudo crear la cuenta.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nombre
          <input
            className="mt-1 w-full rounded-xl border p-3"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Correo del gestor
          <input
            className="mt-1 w-full rounded-xl border p-3"
            required
            type="email"
            autoComplete="off"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="sm:col-span-2">
          Primer acceso
          <select
            className="mt-1 w-full rounded-xl border p-3"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="activation">
              Enlace de activación: el gestor define su contraseña
            </option>
            <option value="temporary">
              Contraseña temporal: debe cambiarla al entrar
            </option>
          </select>
        </label>
        {mode === "temporary" && (
          <label className="sm:col-span-2">
            Contraseña temporal
            <input
              className="mt-1 w-full rounded-xl border p-3"
              required
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="mt-1 block text-sm text-slate-500">
              Mínimo 12 caracteres, letras y números. Compártela de forma
              privada; no podrá consultarse después.
            </span>
          </label>
        )}
        <button
          disabled={busy}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50 sm:col-span-2"
        >
          {busy ? "Creando…" : "Crear cuenta de gestor"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {link && (
        <div className="space-y-3 rounded-xl bg-indigo-50 p-4">
          <p className="font-bold">Cuenta preparada: {createdEmail}</p>
          <p className="text-sm">
            Comparte este enlace privado con el gestor para que defina su
            contraseña. Caduca en 7 días. También puede entrar con su contraseña
            temporal si elegiste esa opción.
          </p>
          <input
            aria-label="Enlace de activación"
            className="w-full rounded-lg border bg-white p-2 text-sm"
            value={link}
            readOnly
          />
          <button
            className="rounded-lg border bg-white px-4 py-2 font-bold"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              } catch {
                setError("Selecciona y copia el enlace manualmente.");
              }
            }}
          >
            {copied ? "Enlace copiado" : "Copiar enlace de activación"}
          </button>
        </div>
      )}
    </section>
  );
}
