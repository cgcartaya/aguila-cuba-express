/* =========================================================
   SEARCH UTILS

   Búsqueda flexible para productos, categorías y textos.
   - Ignora mayúsculas/minúsculas
   - Ignora tildes
   - Permite búsquedas parciales
   - Busca por varias palabras
========================================================= */

export function normalizeSearchText(text = "") {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchesSearch(searchableText: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;

  const normalizedText = normalizeSearchText(searchableText);

  return normalizedQuery
    .split(" ")
    .filter(Boolean)
    .every((word) => normalizedText.includes(word));
}

export function productMatchesSearch(product: any, query: string) {
  return matchesSearch(
    `
    ${product.name || ""}
    ${product.category || ""}
    ${product.description || ""}
    `,
    query
  );
}