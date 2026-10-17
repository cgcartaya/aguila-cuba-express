"use client";
import { useState } from "react";
import { gestorApi, publicShareappApi } from "@/lib/shareapp/client";
import { validPassword } from "@/lib/shareapp/password-policy";

type Props = {
  token?: string;
  email?: string;
  activation?: boolean;
  onComplete: (email?: string) => void | Promise<void>;
};
export default function PasswordForm({
  token,
  email,
  activation = false,
  onComplete,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mx-auto w-full max-w-md space-y-4 rounded-3xl border bg-white p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (!validPassword(password)) {
          setError("Usa de 12 a 128 caracteres, con letras y números.");
          return;
        }
        if (password !== confirm) {
          setError("Las contraseñas no coinciden.");
          return;
        }
        setBusy(true);
        try {
          const data = token
            ? await publicShareappApi<{ email: string }>("activation", {
                token,
                password,
              })
            : await gestorApi<{ email?: string }>("password", { password });
          setPassword("");
          setConfirm("");
          await onComplete(data.email);
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo guardar.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl font-black">
        {activation
          ? "Activa tu cuenta de gestor"
          : "Define tu contraseña personal"}
      </h2>
      {email && <p className="break-all font-bold text-indigo-700">{email}</p>}
      <p className="text-sm text-slate-500">
        Esta contraseña será la que uses para entrar en ShareAPP. El dueño de la
        tienda no podrá consultarla. Si recibiste una temporal, elige una
        diferente.
      </p>
      <label className="block">
        Nueva contraseña
        <input
          required
          minLength={12}
          maxLength={128}
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="block">
        Repite la contraseña
        <input
          required
          type="password"
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border p-3"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      <p className="text-sm text-slate-500">
        Mínimo 12 caracteres, incluyendo letras y números.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="w-full rounded-xl bg-indigo-600 p-3 font-bold text-white disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
