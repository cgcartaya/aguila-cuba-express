"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Save,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { optimizeImageFile } from "@/lib/images/optimizeImage";

export default function AdminAccountPage() {
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userError || !data.user) {
        setError("No se pudo cargar el perfil del usuario conectado.");
        setLoading(false);
        return;
      }

      const metadata = data.user.user_metadata || {};
      setUserId(data.user.id);
      setEmail(data.user.email || "");
      setFullName(metadata.full_name || metadata.name || "");
      setPhone(metadata.phone || "");
      setAvatarUrl(metadata.avatar_url || metadata.picture || "");
      setLoading(false);
    };

    void loadUser();
    return () => {
      mounted = false;
    };
  }, []);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !userId) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const optimized = await optimizeImageFile(file, "logo");
      const extension = optimized.name.split(".").pop() || "png";
      const path = `profiles/${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(path, optimized, {
          cacheControl: "31536000",
          contentType: optimized.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("products").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      setSuccess("Foto lista. Pulsa Guardar perfil para confirmar el cambio.");
    } catch (uploadError) {
      console.error("Error subiendo avatar:", uploadError);
      setError("No se pudo subir la foto. Inténtalo nuevamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
      },
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message || "No se pudo guardar el perfil.");
      return;
    }

    window.dispatchEvent(new Event("admin-profile-updated"));
    setSuccess("Perfil actualizado correctamente.");
  };

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || email.slice(0, 1).toUpperCase() || "U";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Cuenta</p>
            <h1 className="mt-1 text-2xl font-black text-[#061b3a] sm:text-3xl">Mi perfil</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Administra la información de la persona que tiene esta sesión iniciada.
            </p>
          </div>

          <Link
            href="/admin/account/password"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#061b3a] shadow-sm transition hover:bg-slate-50"
          >
            <KeyRound size={18} />
            Cambiar contraseña
          </Link>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <section className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="relative mx-auto h-32 w-32">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Foto de perfil" className="h-32 w-32 rounded-[2rem] object-cover shadow-lg" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] bg-[#061b3a] text-3xl font-black text-white shadow-lg">
                {initials}
              </div>
            )}

            <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-white text-[#061b3a] shadow-lg ring-1 ring-slate-200">
              {uploading ? <Loader2 size={19} className="animate-spin" /> : <Camera size={19} />}
              <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading || loading} className="hidden" />
            </label>
          </div>

          <h2 className="mt-5 text-lg font-black text-[#061b3a]">{fullName || "Tu nombre"}</h2>
          <p className="mt-1 break-all text-sm font-semibold text-slate-400">{email}</p>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
            La foto se verá también en el menú lateral del panel administrativo.
          </p>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <div className="flex items-center gap-2 text-sm font-bold text-slate-500"><Loader2 className="animate-spin" size={18} /> Cargando perfil...</div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-2 block text-sm font-black text-[#061b3a]">Nombre completo</span>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre y apellidos" className="w-full rounded-2xl border border-slate-200 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#061b3a]">Correo</span>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input value={email} readOnly className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-slate-500 outline-none" />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-[#061b3a]">Teléfono</span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className="w-full rounded-2xl border border-slate-200 py-3.5 pl-12 pr-4 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
                  </div>
                </label>
              </div>

              {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
              {success && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} />{success}</div>}

              <button type="submit" disabled={saving || uploading} className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? "Guardando..." : "Guardar perfil"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
