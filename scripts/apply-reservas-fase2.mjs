import fs from "node:fs";

function patchFile(path, mutator) {
  let s = fs.readFileSync(path, "utf8");
  const next = mutator(s);
  if (next === s) console.log("✓ " + path + ": sin cambios / ya aplicado");
  else {
    fs.writeFileSync(path, next);
    console.log("→ " + path + ": actualizado");
  }
}

patchFile("lib/services/reservas.ts", (s) => {
  if (!s.includes("ReservationSpace,")) {
    s = s.replace(
      "  ReservationSlot,\n",
      "  ReservationSlot,\n  ReservationSpace,\n  ReservationSpaceFormData,\n"
    );
  }

  if (!s.includes("ADMIN — ESPACIOS")) {
    const marker = "/* =========================================================\n   ADMIN — MESAS";
    const block = `/* =========================================================
   ADMIN — ESPACIOS
========================================================= */

export async function getReservationSpacesForAdmin(storeId: string) {
  return supabase
    .from("reservation_spaces")
    .select("id, store_id, name, description, space_type, floor_label, image_url, is_active, sort_order, created_at, updated_at")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true }) as unknown as Promise<{
      data: ReservationSpace[] | null;
      error: { message: string } | null;
    }>;
}

export async function saveReservationSpace(
  storeId: string,
  form: ReservationSpaceFormData
) {
  const payload = {
    store_id: storeId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    space_type: form.space_type,
    floor_label: form.floor_label.trim() || null,
    image_url: form.image_url.trim() || null,
    is_active: form.is_active,
    sort_order: form.sort_order,
    updated_at: new Date().toISOString(),
  };

  if (form.id) {
    return supabase
      .from("reservation_spaces")
      .update(payload)
      .eq("id", form.id)
      .select()
      .single();
  }

  return supabase
    .from("reservation_spaces")
    .insert(payload)
    .select()
    .single();
}

export async function deleteReservationSpace(id: string) {
  return supabase.from("reservation_spaces").delete().eq("id", id);
}

`;
    if (!s.includes(marker)) throw new Error("No encontré marcador ADMIN — MESAS");
    s = s.replace(marker, block + marker);
  }

  s = s.replace(
    '.select("id, store_id, name, capacity, seat_type, zone, pos_row, pos_col, is_active, sort_order")',
    '.select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, is_active, sort_order")'
  );

  if (!s.includes("space_id: form.space_id")) {
    s = s.replace(
      "    zone: form.zone.trim() || null,\n",
      "    zone: form.zone.trim() || null,\n    space_id: form.space_id || null,\n"
    );
  }

  return s;
});

patchFile("lib/services/reservas-public.ts", (s) => {
  if (!s.includes("ReservationSpace")) {
    s = s.replace(
      "import type { ReservationSlot, ReservationTable, ReservationStatus }",
      "import type { ReservationSlot, ReservationTable, ReservationStatus, ReservationSpace }"
    );
  }

  if (!s.includes("spaces: ReservationSpace[];")) {
    s = s.replace(
      "  tables: ReservationTable[];\n",
      "  spaces: ReservationSpace[];\n  tables: ReservationTable[];\n"
    );
  }

  s = s.replace(
    "      tables: [],\n      slots: [],",
    "      spaces: [],\n      tables: [],\n      slots: [],"
  );

  const oldPromise = `  const [{ data: tables, error: tablesError }, { data: slots, error: slotsError }] =
    await Promise.all([
      supabaseAdmin
        .from("reservation_tables")
        .select("id, store_id, name, capacity, seat_type, zone, pos_row, pos_col, is_active, sort_order")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("reservation_slots")
        .select("id, store_id, label, start_time, duration_minutes, days_of_week, is_active, sort_order")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);`;

  const newPromise = `  const [
    { data: spaces, error: spacesError },
    { data: tables, error: tablesError },
    { data: slots, error: slotsError },
  ] = await Promise.all([
    supabaseAdmin
      .from("reservation_spaces")
      .select("id, store_id, name, description, space_type, floor_label, image_url, is_active, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("reservation_tables")
      .select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, is_active, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("reservation_slots")
      .select("id, store_id, label, start_time, duration_minutes, days_of_week, is_active, sort_order")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);`;

  if (s.includes(oldPromise)) s = s.replace(oldPromise, newPromise);

  if (!s.includes('getPublicReservationBoard spaces error')) {
    s = s.replace(
      '  if (tablesError) console.error("getPublicReservationBoard tables error:", tablesError.message);',
      '  if (spacesError) console.error("getPublicReservationBoard spaces error:", spacesError.message);\n  if (tablesError) console.error("getPublicReservationBoard tables error:", tablesError.message);'
    );
  }

  if (!s.includes("spaces: (spaces ?? []) as ReservationSpace[]")) {
    s = s.replace(
      "    tables: (tables ?? []) as ReservationTable[],",
      "    spaces: (spaces ?? []) as ReservationSpace[],\n    tables: (tables ?? []) as ReservationTable[],"
    );
  }

  return s;
});

console.log("");
console.log("✅ Servicios de Reservas Fase 2 aplicados.");
