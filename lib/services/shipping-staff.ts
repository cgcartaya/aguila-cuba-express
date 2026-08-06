"use client";

import { supabase } from "@/lib/supabase";
import type { StaffShipment, StaffUser, StaffUserInput } from "@/lib/shipping/staff-types";

const STAFF_PHOTOS_BUCKET = "staff-photos";


async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalize(value?: string) {
  const cleaned = value?.trim();
  return cleaned || null;
}

function getPhotoExtension(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();

  if (byName && ["jpg", "jpeg", "png", "webp"].includes(byName)) {
    return byName === "jpeg" ? "jpg" : byName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";

  return "jpg";
}

export async function uploadStaffPhoto(storeId: string, file: File) {
  const path = `${storeId}/${crypto.randomUUID()}.${getPhotoExtension(file)}`;

  const { error } = await supabase.storage
    .from(STAFF_PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (error) {
    return { url: null, path: null, error };
  }

  const { data } = supabase.storage
    .from(STAFF_PHOTOS_BUCKET)
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    error: null,
  };
}

export async function removeStaffPhoto(photoUrl?: string | null) {
  if (!photoUrl) {
    return { error: null };
  }

  const marker = `/storage/v1/object/public/${STAFF_PHOTOS_BUCKET}/`;
  const markerIndex = photoUrl.indexOf(marker);

  // No intentamos borrar URLs externas o antiguas.
  if (markerIndex < 0) {
    return { error: null };
  }

  const path = decodeURIComponent(
    photoUrl.slice(markerIndex + marker.length)
  );

  const { error } = await supabase.storage
    .from(STAFF_PHOTOS_BUCKET)
    .remove([path]);

  return { error };
}

export async function getStaffShipments(
  storeId: string,
  staffId: string
) {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("store_id", storeId)
    .eq("assigned_staff_id", staffId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return {
    data: (data || []) as StaffShipment[],
    error,
  };
}

export async function getShippingStaff(storeId: string) {
  const { data, error } = await supabase
    .from("staff_users")
    .select("*")
    .eq("store_id", storeId)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  return { data: (data || []) as StaffUser[], error };
}

export async function createShippingStaff(input: StaffUserInput) {
  const { data, error } = await supabase
    .from("staff_users")
    .insert({
      store_id: input.store_id,
      username: input.username.trim().toLowerCase(),
      password_hash: await hashPassword(input.password),
      role: input.role,
      status: input.status,
      first_name: input.first_name.trim(),
      last_name: input.last_name.trim(),
      phone: normalize(input.phone),
      whatsapp: normalize(input.whatsapp),
      email: normalize(input.email)?.toLowerCase() || null,
      photo_url: normalize(input.photo_url),
      vehicle_type: normalize(input.vehicle_type),
      vehicle_plate: normalize(input.vehicle_plate)?.toUpperCase() || null,
      notes: normalize(input.notes),
    })
    .select("*")
    .single();

  return { data: data as StaffUser | null, error };
}

export async function updateShippingStaff(
  id: string,
  input: Omit<StaffUserInput, "store_id" | "password"> & { password?: string }
) {
  const payload: Record<string, unknown> = {
    username: input.username.trim().toLowerCase(),
    role: input.role,
    status: input.status,
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: normalize(input.phone),
    whatsapp: normalize(input.whatsapp),
    email: normalize(input.email)?.toLowerCase() || null,
    photo_url: normalize(input.photo_url),
    vehicle_type: normalize(input.vehicle_type),
    vehicle_plate: normalize(input.vehicle_plate)?.toUpperCase() || null,
    notes: normalize(input.notes),
    updated_at: new Date().toISOString(),
  };

  if (input.password?.trim()) {
    payload.password_hash = await hashPassword(input.password.trim());
  }

  const { data, error } = await supabase
    .from("staff_users")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  return { data: data as StaffUser | null, error };
}

export async function setShippingStaffStatus(
  id: string,
  status: StaffUser["status"]
) {
  const { error } = await supabase
    .from("staff_users")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  return { error };
}
