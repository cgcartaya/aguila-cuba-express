import fs from "node:fs";

const p = "app/admin/(store)/reservas/page.tsx";
let s = fs.readFileSync(p, "utf8");

function replaceOnce(oldText, newText, label) {
  if (s.includes(newText)) {
    console.log("✓ " + label + ": ya aplicado");
    return;
  }

  if (!s.includes(oldText)) {
    throw new Error("No encontré bloque: " + label);
  }

  s = s.replace(oldText, newText);
  console.log("→ " + label);
}

// 1) loadData permite refresco silencioso.
// En el refresco silencioso NO activamos el loader global, por lo que
// SpaceManager y SpaceFloorPlanEditor no se desmontan.
replaceOnce(
  `  const loadData = async () => {
    if (accessLoading || storeLoading) return;`,
  `  const loadData = async (silent = false) => {
    if (accessLoading || storeLoading) return;`,
  "loadData con modo silencioso"
);

replaceOnce(
  `    setLoading(true);
    const [`,
  `    if (!silent) setLoading(true);
    const [`,
  "evitar loader global durante cambios del plano"
);

replaceOnce(
  `    setBlockedDates(blockedData || []);
    setLoading(false);
  };`,
  `    setBlockedDates(blockedData || []);
    if (!silent) setLoading(false);
  };`,
  "cerrar loader solo en carga normal"
);

// 2) Los managers hacen refresh silencioso.
// Así editar mesa, espacio, arrastrar, crear pared, puerta, etc.
// actualiza datos sin desmontar el editor.
s = s.replaceAll(
  `onChange={loadData}`,
  `onChange={() => void loadData(true)}`
);

fs.writeFileSync(p, s);

console.log("");
console.log("✅ El editor del plano ya no se desmontará al guardar o mover elementos.");
console.log("Ahora ejecuta: npm run build");
