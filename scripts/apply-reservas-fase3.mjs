import fs from "node:fs";

function patchFile(path, fn) {
  let s = fs.readFileSync(path, "utf8");
  const next = fn(s);
  if (next !== s) {
    fs.writeFileSync(path, next);
    console.log("→ " + path);
  } else {
    console.log("✓ " + path + ": ya aplicado / sin cambios");
  }
}

patchFile("lib/services/reservas.ts", (s) => {
  if (!s.includes("ReservationSpaceElement,")) {
    s = s.replace(
      "  ReservationSpaceFormData,\n",
      "  ReservationSpaceFormData,\n  ReservationSpaceElement,\n  ReservationSpaceElementFormData,\n"
    );
  }

  s = s.replace(
    '.select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, is_active, sort_order")',
    '.select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, pos_x, pos_y, rotation, table_shape, is_active, sort_order")'
  );

  if (!s.includes("pos_x: form.pos_x")) {
    s = s.replace(
      "    pos_col: form.pos_col,\n",
      "    pos_col: form.pos_col,\n    pos_x: form.pos_x,\n    pos_y: form.pos_y,\n    rotation: form.rotation,\n    table_shape: form.table_shape,\n"
    );
  }

  if (!s.includes("ADMIN — ELEMENTOS DEL PLANO")) {
    const marker = "/* =========================================================\n   ADMIN — FRANJAS HORARIAS";
    const block = `/* =========================================================
   ADMIN — ELEMENTOS DEL PLANO
========================================================= */

export async function getReservationSpaceElementsForAdmin(
  storeId: string,
  spaceId?: string
) {
  let query = supabase
    .from("reservation_space_elements")
    .select("id, store_id, space_id, element_type, label, pos_x, pos_y, width, height, rotation, sort_order")
    .eq("store_id", storeId);

  if (spaceId) query = query.eq("space_id", spaceId);

  return query.order("sort_order", { ascending: true }) as unknown as Promise<{
    data: ReservationSpaceElement[] | null;
    error: { message: string } | null;
  }>;
}

export async function saveReservationSpaceElement(
  storeId: string,
  form: ReservationSpaceElementFormData
) {
  const payload = {
    store_id: storeId,
    space_id: form.space_id,
    element_type: form.element_type,
    label: form.label.trim() || null,
    pos_x: form.pos_x,
    pos_y: form.pos_y,
    width: form.width,
    height: form.height,
    rotation: form.rotation,
    sort_order: form.sort_order,
    updated_at: new Date().toISOString(),
  };

  if (form.id) {
    return supabase
      .from("reservation_space_elements")
      .update(payload)
      .eq("id", form.id)
      .select()
      .single();
  }

  return supabase
    .from("reservation_space_elements")
    .insert(payload)
    .select()
    .single();
}

export async function deleteReservationSpaceElement(id: string) {
  return supabase.from("reservation_space_elements").delete().eq("id", id);
}

export async function updateReservationTableVisualPosition(
  tableId: string,
  posX: number,
  posY: number,
  rotation = 0
) {
  return supabase
    .from("reservation_tables")
    .update({ pos_x: posX, pos_y: posY, rotation })
    .eq("id", tableId);
}

`;
    if (!s.includes(marker)) throw new Error("No encontré marcador FRANJAS");
    s = s.replace(marker, block + marker);
  }

  return s;
});

patchFile("lib/services/reservas-public.ts", (s) => {
  if (!s.includes("ReservationSpaceElement")) {
    s = s.replace(
      "ReservationSpace }",
      "ReservationSpace, ReservationSpaceElement }"
    );
  }

  if (!s.includes("elements: ReservationSpaceElement[];")) {
    s = s.replace(
      "  spaces: ReservationSpace[];\n",
      "  spaces: ReservationSpace[];\n  elements: ReservationSpaceElement[];\n"
    );
  }

  s = s.replace(
    "      spaces: [],\n      tables: [],",
    "      spaces: [],\n      elements: [],\n      tables: [],"
  );

  s = s.replace(
    `  const [
    { data: spaces, error: spacesError },
    { data: tables, error: tablesError },
    { data: slots, error: slotsError },
  ] = await Promise.all([`,
    `  const [
    { data: spaces, error: spacesError },
    { data: elements, error: elementsError },
    { data: tables, error: tablesError },
    { data: slots, error: slotsError },
  ] = await Promise.all([`
  );

  if (!s.includes('.from("reservation_space_elements")')) {
    s = s.replace(
      `    supabaseAdmin
      .from("reservation_tables")`,
      `    supabaseAdmin
      .from("reservation_space_elements")
      .select("id, store_id, space_id, element_type, label, pos_x, pos_y, width, height, rotation, sort_order")
      .eq("store_id", store.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("reservation_tables")`
    );
  }

  s = s.replace(
    '.select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, is_active, sort_order")',
    '.select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, pos_x, pos_y, rotation, table_shape, is_active, sort_order")'
  );

  if (!s.includes('getPublicReservationBoard elements error')) {
    s = s.replace(
      '  if (tablesError) console.error("getPublicReservationBoard tables error:", tablesError.message);',
      '  if (elementsError) console.error("getPublicReservationBoard elements error:", elementsError.message);\n  if (tablesError) console.error("getPublicReservationBoard tables error:", tablesError.message);'
    );
  }

  if (!s.includes("elements: (elements ?? []) as ReservationSpaceElement[]")) {
    s = s.replace(
      "    spaces: (spaces ?? []) as ReservationSpace[],",
      "    spaces: (spaces ?? []) as ReservationSpace[],\n    elements: (elements ?? []) as ReservationSpaceElement[],"
    );
  }

  return s;
});

console.log("");
console.log("✅ Reservas Fase 3 aplicada.");
