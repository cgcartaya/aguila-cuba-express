"use client";

/* =========================================================
   FASE 3.7 - USUARIOS DE TIENDA

   Ruta:
   /admin/stores/[id]/users

   Solo Super Admin puede entrar porque vive dentro del layout SaaS.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  UserCog,
  XCircle,
} from "lucide-react";

import {
  createStoreUser,
  getStoreUsers,
  updateStoreUser,
  type StoreUserMembership,
} from "@/lib/services/store-users";

type StoreInfo = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean | null;
};

function generateTemporaryPassword() {
  const random = crypto.randomUUID().slice(0, 8);
  return `Cliente${random}!`;
}

export default function StoreUsersPage() {
  const params = useParams();
  const storeId = params.id as string;

  const [store, setStore] = useState<StoreInfo | null>(null);
  const [users, setUsers] = useState<StoreUserMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: generateTemporaryPassword(),
  });

  const activeUsers = useMemo(
    () => users.filter((user) => user.active).length,
    [users]
  );

  async function loadUsers() {
    if (!storeId) return;

    setLoading(true);

    const result = await getStoreUsers(storeId);

    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }

    setStore(result.store);
    setUsers(result.data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!form.email.trim() || !form.password.trim()) {
      alert("Correo y contraseña son obligatorios.");
      return;
    }

    setSaving(true);

    const result = await createStoreUser({
      store_id: storeId,
      email: form.email.trim().toLowerCase(),
      password: form.password.trim(),
      full_name: form.full_name.trim(),
    });

    setSaving(false);

    if (result.error) {
      alert(result.error);
      return;
    }

    alert("Usuario creado y asignado a la tienda correctamente.");

    setForm({
      full_name: "",
      email: "",
      password: generateTemporaryPassword(),
    });

    setShowCreateForm(false);
    await loadUsers();
  }

  async function handleToggleUser(user: StoreUserMembership) {
    const nextActive = !user.active;

    const confirmMessage = nextActive
      ? "¿Activar este usuario?"
      : "¿Desactivar este usuario? No podrá entrar al panel de su tienda.";

    if (!confirm(confirmMessage)) return;

    const result = await updateStoreUser(user.id, {
      active: nextActive,
    });

    if (result.error) {
      alert(result.error);
      return;
    }

    await loadUsers();
  }

  async function handleResetPassword(user: StoreUserMembership) {
    const password = prompt(
      `Nueva contraseña temporal para ${user.profile?.email || "este usuario"}:`,
      generateTemporaryPassword()
    );

    if (!password) return;

    const result = await updateStoreUser(user.id, {
      password,
    });

    if (result.error) {
      alert(result.error);
      return;
    }

    alert("Contraseña actualizada correctamente.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href="/admin/stores"
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[#061b3a]"
        >
          <ArrowLeft size={18} />
          Volver a tiendas
        </Link>

        <section className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Gestión de accesos
            </p>

            <h1 className="text-2xl font-black text-slate-900">
              Usuarios de {store?.name || "la tienda"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Crea y administra los usuarios que pueden entrar al admin de esta
              tienda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                <UserCog className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Usuarios</p>
                <p className="text-2xl font-black text-slate-900">
                  {users.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Activos</p>
                <p className="text-2xl font-black text-slate-900">
                  {activeUsers}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm text-slate-500">Rol permitido</p>
                <p className="text-2xl font-black text-slate-900">Owner</p>
              </div>
            </div>
          </div>
        </section>

        {showCreateForm && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#061b3a]">
              Crear administrador de tienda
            </h2>

            <form
              onSubmit={handleCreateUser}
              className="mt-5 grid gap-4 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nombre
                </label>

                <input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="Administrador DL Racing"
                  className="w-full rounded-2xl border p-3 outline-none focus:border-[#061b3a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Correo
                </label>

                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                  placeholder="admin@cliente.com"
                  className="w-full rounded-2xl border p-3 outline-none focus:border-[#061b3a]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Contraseña temporal
                </label>

                <div className="flex gap-2">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border p-3 outline-none focus:border-[#061b3a]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-2xl border px-4 text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        password: generateTemporaryPassword(),
                      })
                    }
                    className="rounded-2xl border px-4 text-sm font-black text-[#061b3a]"
                  >
                    Generar
                  </button>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Guárdala y envíasela al cliente. Más adelante podemos agregar
                  email automático.
                </p>
              </div>

              <div className="flex gap-3 md:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-2xl border px-5 py-3 text-sm font-black text-[#061b3a]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-slate-900">
            Usuarios asignados
          </h2>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#061b3a]" />
              <p className="font-semibold text-slate-600">
                Cargando usuarios...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <p className="font-semibold text-slate-700">
                Esta tienda todavía no tiene usuarios asignados.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Crea el primer usuario para que el cliente pueda entrar.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {users.map((user) => (
                <article
                  key={user.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h3 className="font-black text-[#061b3a]">
                      {user.profile?.full_name || "Usuario sin nombre"}
                    </h3>

                    <p className="text-sm font-semibold text-slate-500">
                      {user.profile?.email || "Correo no disponible"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {user.role}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          user.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user)}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black text-[#061b3a]"
                    >
                      <KeyRound size={14} />
                      Reset password
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleUser(user)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black ${
                        user.active
                          ? "bg-red-50 text-red-600"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {user.active ? (
                        <>
                          <XCircle size={14} />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          Activar
                        </>
                      )}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
