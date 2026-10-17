"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PasswordForm from "@/components/shareapp/PasswordForm";
import { publicShareappApi } from "@/lib/shareapp/client";
export default function ActivatePage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const value =
      new URLSearchParams(window.location.hash.slice(1)).get("setup") || "";
    window.history.replaceState(null, "", "/gestores/activar");
    void publicShareappApi<{ email: string }>("activation", {
      token: value,
      action: "inspect",
    })
      .then((data) => {
        setEmail(data.email);
        setToken(value);
      })
      .catch((e) => setError(e.message));
  }, []);
  return (
    <main className="min-h-screen bg-slate-50 p-5 py-12 text-slate-900">
      <h1 className="mb-6 text-center text-3xl font-black">ShareAPP</h1>
      {done ? (
        <section className="mx-auto max-w-md rounded-3xl border bg-white p-6">
          <h2 className="text-2xl font-bold">Tu cuenta está lista</h2>
          <p className="mt-3">
            Entra desde la app con {email} y tu contraseña personal.
          </p>
          <Link
            className="mt-5 block rounded-xl bg-indigo-600 p-3 text-center font-bold text-white"
            href="/gestores"
          >
            Ir a iniciar sesión
          </Link>
        </section>
      ) : error ? (
        <p
          role="alert"
          className="mx-auto max-w-md rounded-xl bg-red-50 p-5 text-red-700"
        >
          {error}
        </p>
      ) : token ? (
        <PasswordForm
          token={token}
          email={email}
          activation
          onComplete={() => setDone(true)}
        />
      ) : (
        <p className="text-center">Verificando enlace…</p>
      )}
    </main>
  );
}
