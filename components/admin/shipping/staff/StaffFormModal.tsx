"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import type { StaffRole, StaffStatus, StaffUser, StaffUserInput } from "@/lib/shipping/staff-types";
import { STAFF_ROLE_LABELS, STAFF_STATUS_LABELS } from "@/lib/shipping/staff-types";
import { removeStaffPhoto, uploadStaffPhoto } from "@/lib/services/shipping-staff";

const emptyForm = {
  username: "",
  password: "",
  role: "DELIVERY" as StaffRole,
  status: "ACTIVE" as StaffStatus,
  first_name: "",
  last_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  photo_url: "",
  vehicle_type: "",
  vehicle_plate: "",
  notes: "",
};

type FormState = typeof emptyForm;

type Props = {
  open: boolean;
  storeId: string;
  user: StaffUser | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: StaffUserInput) => Promise<void>;
};

export default function StaffFormModal({ open, storeId, user, saving, onClose, onSave }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [removeCurrentPhoto, setRemoveCurrentPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setPhotoFile(null);
    setRemoveCurrentPhoto(false);
    setPhotoPreview(user?.photo_url || "");
    setForm(user ? {
      username: user.username,
      password: "",
      role: user.role,
      status: user.status,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || "",
      whatsapp: user.whatsapp || "",
      email: user.email || "",
      photo_url: user.photo_url || "",
      vehicle_type: user.vehicle_type || "",
      vehicle_plate: user.vehicle_plate || "",
      notes: user.notes || "",
    } : emptyForm);
  }, [open, user]);

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  if (!open) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("La foto no puede pesar más de 5 MB.");
      return;
    }
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemoveCurrentPhoto(false);
    setError("");
  }

  function clearPhoto() {
    if (photoPreview.startsWith("blob:")) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview("");
    setRemoveCurrentPhoto(Boolean(user?.photo_url));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.first_name.trim() || !form.last_name.trim() || !form.username.trim()) {
      setError("Nombre, apellidos y usuario son obligatorios.");
      return;
    }
    if (!user && form.password.trim().length < 6) {
      setError("La contraseña temporal debe tener al menos 6 caracteres.");
      return;
    }

    setUploading(true);
    let photoUrl = form.photo_url;

    if (photoFile) {
      const uploaded = await uploadStaffPhoto(storeId, photoFile);
      if (uploaded.error || !uploaded.url) {
        setUploading(false);
        setError(uploaded.error?.message || "No se pudo subir la foto.");
        return;
      }
      photoUrl = uploaded.url;
    } else if (removeCurrentPhoto) {
      photoUrl = "";
    }

    await onSave({ ...form, photo_url: photoUrl, store_id: storeId });

    if (photoFile && user?.photo_url && user.photo_url !== photoUrl) void removeStaffPhoto(user.photo_url);
    if (removeCurrentPhoto && user?.photo_url) void removeStaffPhoto(user.photo_url);
    setUploading(false);
  }

  const busy = saving || uploading;
  const field = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
  const label = "mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500";
  const initials = `${form.first_name.slice(0, 1)}${form.last_name.slice(0, 1)}`.toUpperCase() || "P";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl md:max-w-4xl md:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-5 py-4 backdrop-blur md:px-7">
          <div><h2 className="text-xl font-black text-slate-900">{user ? "Editar personal" : "Nuevo usuario"}</h2><p className="text-sm font-medium text-slate-500">Datos de acceso y perfil operativo.</p></div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar"><X /></button>
        </div>

        <form onSubmit={submit} className="space-y-7 p-5 md:p-7">
          {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}

          <section>
            <h3 className="mb-4 text-base font-black text-slate-900">Foto del personal</h3>
            <div className="flex flex-col gap-5 rounded-3xl border border-dashed border-blue-200 bg-blue-50/60 p-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 shadow-inner">
                {photoPreview ? <img src={photoPreview} alt="Vista previa" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black text-blue-700">{initials}</div>}
                <div className="absolute bottom-2 right-2 rounded-full bg-white p-2 text-blue-700 shadow"><Camera size={16} /></div>
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-900">Selecciona una foto desde este dispositivo</p>
                <p className="mt-1 text-sm font-medium text-slate-500">JPG, PNG o WebP. Máximo 5 MB.</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => selectPhoto(e.target.files?.[0])} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-2xl bg-[#0a2d63] px-4 py-2.5 text-sm font-black text-white"><ImagePlus size={17} /> {photoPreview ? "Cambiar foto" : "Seleccionar foto"}</button>
                  {photoPreview && <button type="button" onClick={clearPhoto} disabled={busy} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-black text-rose-700"><Trash2 size={17} /> Quitar</button>}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-base font-black text-slate-900">Información personal</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={label}>Nombre</label><input className={field} value={form.first_name} onChange={(e)=>set("first_name",e.target.value)} /></div>
              <div><label className={label}>Apellidos</label><input className={field} value={form.last_name} onChange={(e)=>set("last_name",e.target.value)} /></div>
              <div><label className={label}>Teléfono</label><input className={field} value={form.phone} onChange={(e)=>set("phone",e.target.value.replace(/[^0-9+]/g,""))} /></div>
              <div><label className={label}>WhatsApp</label><input className={field} value={form.whatsapp} onChange={(e)=>set("whatsapp",e.target.value.replace(/[^0-9+]/g,""))} /></div>
              <div className="md:col-span-2"><label className={label}>Correo (opcional)</label><input type="email" className={field} value={form.email} onChange={(e)=>set("email",e.target.value)} /></div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-base font-black text-slate-900">Acceso y operación</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className={label}>Usuario</label><input autoCapitalize="none" className={field} value={form.username} onChange={(e)=>set("username",e.target.value)} /></div>
              <div><label className={label}>{user ? "Nueva contraseña (opcional)" : "Contraseña temporal"}</label><input type="password" className={field} value={form.password} onChange={(e)=>set("password",e.target.value)} /></div>
              <div><label className={label}>Rol</label><select className={field} value={form.role} onChange={(e)=>set("role",e.target.value as StaffRole)}>{Object.entries(STAFF_ROLE_LABELS).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></div>
              <div><label className={label}>Estado</label><select className={field} value={form.status} onChange={(e)=>set("status",e.target.value as StaffStatus)}>{Object.entries(STAFF_STATUS_LABELS).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></div>
              <div><label className={label}>Vehículo</label><select className={field} value={form.vehicle_type} onChange={(e)=>set("vehicle_type",e.target.value)}><option value="">Sin especificar</option><option>Moto</option><option>Carro</option><option>Camión</option><option>Bicicleta</option><option>A pie</option></select></div>
              <div><label className={label}>Matrícula</label><input className={field} value={form.vehicle_plate} onChange={(e)=>set("vehicle_plate",e.target.value)} /></div>
              <div className="md:col-span-2"><label className={label}>Observaciones</label><textarea rows={3} className={field} value={form.notes} onChange={(e)=>set("notes",e.target.value)} /></div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0a2d63] px-6 py-3 font-black text-white shadow-lg disabled:opacity-60">{busy && <Loader2 size={18} className="animate-spin" />}{uploading ? "Subiendo foto..." : user ? "Guardar cambios" : "Crear usuario"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
