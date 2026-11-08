import type { PerlaClient } from "@/lib/services/perla-showcase";

const references = [
  { slug: "aguila", name: "Águila Express USA", image: "aguila" },
  { slug: "alvarez-travel", name: "Álvarez Travel", image: "alvarez" },
  { slug: "yoyo-envios", name: "Yoyó Envíos", image: "yoyo" },
  { slug: "deparis", name: "DeParis", image: "deparis" },
  { slug: "tumercadolajero", name: "TuMercadoLajero" },
  { slug: "mercado-trebol-express", name: "Mercado Trébol Express" },
  { slug: "combos-martinez", name: "Combos Martínez" },
  { slug: "bar1820", name: "Bar 1820" },
  { slug: "jotajota", name: "Jota Jota" },
  { slug: "dreamon", name: "DreamOn" },
  { slug: "dl-racing-cyber", name: "DL Racing Cyber" },
  { slug: "luxury-travel-point", name: "Luxury Travel Point" },
  { slug: "wf-cago", name: "WF Cago" },
];

// This only arranges the public, enabled records supplied by the server.
// Reference entries must never resurrect an inactive/unpublished customer.
export function layoutClients(clients: PerlaClient[]) {
  const ordered = clients.map(client => {
    const index = references.findIndex(item => item.slug === client.slug);
    const reference = references[index];
    return { ...client, displayName: reference?.name || client.name,
      screenshot: reference?.image ? `/perla/clients/${reference.image}.webp` : null,
      rank: index < 0 ? references.length : index };
  }).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  return { featured: ordered.filter(client => client.screenshot), remaining: ordered.filter(client => !client.screenshot) };
}
