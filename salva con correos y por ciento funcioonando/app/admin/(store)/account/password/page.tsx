"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !data.user?.email) {
        setError("No se pudo identificar el usuario conectado.");
      } else {
        setEmail(data.user.email);
      }

      setLoadingUser(false);
    };

    void loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("No se encontró el correo del usuario conectado.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Completa los tres campos de contraseña.");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    if (newPassword === currentPassword) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    setSaving(true);

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        setError("La contraseña actual no es correcta.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || "No se pudo cambiar la contraseña.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Tu contraseña se cambió correctamente.");
    } catch (unexpectedError) {
      console.error("Error cambiando contraseña:", unexpectedError);
      setError("Ocurrió un error inesperado. Inténtalo nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <section className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-700">
            <KeyRound size={30} />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Seguridad de la cuenta
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#061b3a] sm:text-3xl">
              Cambiar mi contraseña
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Esta opción cambia únicamente la contraseña del usuario que tiene la sesión abierta.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
              Usuario conectado
            </p>
            <p className="mt-1 break-all text-sm font-black text-[#061b3a]">
              {loadingUser ? "Cargando usuario..." : email || "No disponible"}
            </p>
          </div>

          <div className="space-y-5">
            <PasswordField
              label="Contraseña actual"
              value={currentPassword}
              onChange={setCurrentPassword}
              visible={showCurrent}
              onToggle={() => setShowCurrent((value) => !value)}
              autoComplete="current-password"
              disabled={saving || loadingUser}
            />

            <PasswordField
              label="Nueva contraseña"
              value={newPassword}
              onChange={setNewPassword}
              visible={showNew}
              onToggle={() => setShowNew((value) => !value)}
              autoComplete="new-password"
              disabled={saving || loadingUser}
            />

            <PasswordField
              label="Confirmar nueva contraseña"
              value={confirmPassword}
              onChange={setConfirmPassword}
              visible={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              autoComplete="new-password"
              disabled={saving || loadingUser}
            />
          </div>

          {error ? (
            <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div role="status" className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={20} />
              {success}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={saving || loadingUser || !email}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <LockKeyhole size={20} />}
            {saving ? "Cambiando contraseña..." : "Cambiar contraseña"}
          </button>
        </form>

        <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <ShieldCheck size={25} />
          </div>
          <h2 className="text-lg font-black text-[#061b3a]">Contraseña segura</h2>
          <ul className="mt-4 space-y-3 text-sm font-semibold leading-5 text-slate-500">
            <li>• Usa al menos {MIN_PASSWORD_LENGTH} caracteres.</li>
            <li>• No reutilices la contraseña actual.</li>
            <li>• Combina letras, números y símbolos.</li>
            <li>• No compartas la contraseña con otras personas.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
};

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  disabled,
}: PasswordFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-[#061b3a]">{label}</span>
      <div className="relative">
        <LockKeyhole
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={19}
        />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </label>
  );
}
