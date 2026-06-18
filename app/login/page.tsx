"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Escribe email y contraseña.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

if (error) {
  console.error("Login error:", error);
  setError(error.message);
  return;
}

  window.location.href = "/admin";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Águila Admin
          </h1>
          <p className="mt-2 text-gray-500">
            Accede al panel administrativo.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-2xl border px-11 py-3 outline-none focus:border-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="password"
              placeholder="Contraseña"
              className="w-full rounded-2xl border px-11 py-3 outline-none focus:border-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 py-4 font-bold text-white disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </div>
      </div>
    </main>
  );
}