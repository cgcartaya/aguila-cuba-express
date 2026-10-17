"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gestorAuth } from "@/lib/shareapp/auth-client";
import PasswordForm from "@/components/shareapp/PasswordForm";
export default function RecoveryPage() {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);
    window.history.replaceState(null, "", "/gestores/recuperar");
    async function recover() {
      if (hash.get("error"))
        throw new Error(
          "El enlace caducó o ya se utilizó. Solicita uno nuevo desde ShareAPP.",
        );
      if (hash.get("access_token") && hash.get("refresh_token")) {
        const { error } = await gestorAuth.auth.setSession({
          access_token: hash.get("access_token")!,
          refresh_token: hash.get("refresh_token")!,
        });
        if (error) throw error;
      } else if (search.get("token_hash")) {
        const { error } = await gestorAuth.auth.verifyOtp({
          token_hash: search.get("token_hash")!,
          type: "recovery",
        });
        if (error) throw error;
      } else
        throw new Error(
          "Abre el enlace que recibiste por correo para recuperar tu contraseña.",
        );
      const { data, error } = await gestorAuth.auth.getUser();
      if (error || !data.user)
        throw new Error("No se pudo verificar el enlace. Solicita uno nuevo.");
      setEmail(data.user.email || "");
      setReady(true);
    }
    void recover().catch((e) => setError(e.message));
  }, []);
  return (
    <main className="min-h-screen bg-slate-50 p-5 py-12 text-slate-900">
      <h1 className="mb-6 text-center text-3xl font-black">ShareAPP</h1>
      {done ? (
        <section className="mx-auto max-w-md space-y-4 rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-bold">Contraseña actualizada</h2>
          <p>Ya puedes entrar con tu nueva contraseña desde ShareAPP.</p>
          <Link
            href="/gestores"
            className="font-bold text-indigo-700 underline"
          >
            Volver a ShareAPP
          </Link>
        </section>
      ) : error ? (
        <section className="mx-auto max-w-md space-y-4">
          <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">
            {error}
          </p>
          <Link href="/gestores" className="underline">
            Volver a iniciar sesión
          </Link>
        </section>
      ) : ready ? (
        <PasswordForm
          email={email}
          onComplete={async () => {
            await gestorAuth.auth.signOut({ scope: "local" });
            setDone(true);
          }}
        />
      ) : (
        <p className="text-center">Verificando recuperación…</p>
      )}
    </main>
  );
}
