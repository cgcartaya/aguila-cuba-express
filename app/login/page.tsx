"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  getLoginBrandByHostname,
  type LoginBrand,
} from "@/lib/services/login-brand";

const DEFAULT_BRAND: LoginBrand = {
  storeId: null,
  storeSlug: null,
  name: "Perla Marketplace",
  logoUrl: null,
  primaryColor: "#6D28D9",
  secondaryColor: "#DB2777",
  subtitle: "Accede al panel de administración",
  isPlatform: true,
};

export default function LoginPage() {
  const [brand, setBrand] = useState<LoginBrand>(DEFAULT_BRAND);
  const [brandLoading, setBrandLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadBrand = async () => {
      try {
        const result = await getLoginBrandByHostname(
          window.location.hostname
        );

        if (mounted) {
          setBrand(result);
        }
      } catch (loadError) {
        console.error("Error inesperado cargando el branding:", loadError);
      } finally {
        if (mounted) {
          setBrandLoading(false);
        }
      }
    };

    void loadBrand();

    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    return brand.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");
  }, [brand.name]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Escribe email y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        console.error("Login error:", loginError);
        setError(
          loginError.message || "No se pudo iniciar sesión."
        );
        return;
      }

      /*
       * Conserva el dominio actual:
       * dlracing.perlamarketplace.com/login -> /admin
       * aguilacubaexpress.com/login          -> /admin
       * perlamarketplace.com/login           -> /admin
       */
      window.location.assign("/admin");
    } catch (loginError) {
      console.error("Error inesperado iniciando sesión:", loginError);
      setError("Ocurrió un error inesperado. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10"
      style={{
        background: `linear-gradient(135deg, ${brand.primaryColor}14 0%, #f8fafc 45%, ${brand.secondaryColor}18 100%)`,
      }}
    >
      <div
        className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: `${brand.primaryColor}22` }}
      />

      <div
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: `${brand.secondaryColor}22` }}
      />

      <section className="relative w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-7 shadow-2xl shadow-slate-200/70 backdrop-blur sm:p-9">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-5 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] border bg-white shadow-sm"
            style={{ borderColor: `${brand.primaryColor}2E` }}
          >
            {brandLoading ? (
              <Loader2
                className="animate-spin"
                size={28}
                style={{ color: brand.primaryColor }}
              />
            ) : brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={`Logo de ${brand.name}`}
                className="h-full w-full object-contain p-3"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                  const fallback =
                    event.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}

            <div
              className={`h-full w-full items-center justify-center text-2xl font-black ${
                brandLoading || brand.logoUrl ? "hidden" : "flex"
              }`}
              style={{
                background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
                color: "#ffffff",
              }}
            >
              {brand.isPlatform ? (
                <Building2 size={34} />
              ) : (
                initials || <Building2 size={34} />
              )}
            </div>
          </div>

          <p
            className="mb-2 text-xs font-black uppercase tracking-[0.22em]"
            style={{ color: brand.primaryColor }}
          >
            {brand.isPlatform
              ? "Administración SaaS"
              : "Administración de tienda"}
          </p>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            {brandLoading ? "Cargando..." : brand.name}
          </h1>

          <p className="mt-2 text-sm font-medium text-slate-500">
            {brand.subtitle}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleLogin}>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Correo electrónico
            </span>

            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                type="email"
                autoComplete="email"
                placeholder="correo@ejemplo.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-slate-900 outline-none transition focus:ring-4"
                style={
                  {
                    "--tw-ring-color": `${brand.primaryColor}20`,
                  } as React.CSSProperties
                }
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-700">
              Contraseña
            </span>

            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />

              <input
                type="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3.5 text-slate-900 outline-none transition focus:ring-4"
                style={
                  {
                    "--tw-ring-color": `${brand.primaryColor}20`,
                  } as React.CSSProperties
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || brandLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.secondaryColor})`,
              boxShadow: `0 16px 34px ${brand.primaryColor}28`,
            }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Entrando...
              </>
            ) : (
              "Entrar al panel"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-semibold text-slate-400">
          Acceso protegido por Perla Marketplace
        </p>
      </section>
    </main>
  );
}
