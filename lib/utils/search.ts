/** Storefront search indexes product identity, never recipe suggestions in descriptions. */
type SearchableProduct = {
  name?: string | null;
  category?: string | null;
};

const CONNECTORS = new Set(["de", "del", "la", "las", "el", "los", "en", "con", "para", "y"]);
const MEAT_TERMS = new Set(["carne", "carnes", "carnico", "carnicos", "carnica", "carnicas", "carniceria", "carnicerias"]);
const MEAT_CATEGORIES = new Set(["pollo", "aves", "cerdo", "res", "embutidos"]);

export function normalizeSearchText(text = "") {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/(\d)(\p{L})/gu, "$1 $2").replace(/(\p{L})(\d)/gu, "$1 $2")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}

function tokens(text: string) {
  const normalized = normalizeSearchText(text);
  return normalized ? normalized.split(" ") : [];
}

function queryTerms(query: string) {
  const words = [...new Set(tokens(query))];
  const meaningful = words.filter((word) => !CONNECTORS.has(word));
  return meaningful.length ? meaningful : words;
}

function variants(word: string) {
  const values = [word];
  if (word.length > 4 && word.endsWith("es")) values.push(word.slice(0, -2));
  if (word.length > 3 && word.endsWith("s")) values.push(word.slice(0, -1));
  return values;
}

function wordScore(word: string, query: string) {
  if (word === query) return 100;
  if (MEAT_TERMS.has(word) && MEAT_TERMS.has(query)) return 85;
  if (variants(word).some((candidate) => variants(query).includes(candidate))) return 80;
  // Prefixes support typing; arbitrary substrings made unrelated words match.
  return query.length >= 2 && word.startsWith(query) ? 50 : 0;
}

function fieldScore(words: string[], query: string) {
  return words.reduce((best, word) => Math.max(best, wordScore(word, query)), 0);
}

export function matchesSearch(searchableText: string, query: string) {
  if (!query.trim()) return true;
  const terms = queryTerms(query);
  const words = tokens(searchableText);
  return terms.length > 0 && terms.every((term) => fieldScore(words, term) > 0);
}

export function productSearchScore(product: SearchableProduct, query: string) {
  if (!query.trim()) return 0;
  const terms = queryTerms(query);
  if (!terms.length) return -1;
  const name = tokens(product.name || "");
  const category = tokens(product.category || "");
  let score = 0;
  for (const term of terms) {
    // Category-only expansion includes the poultry aisle, never a soup whose
    // name happens to mention chicken or a sauce recommended for meat.
    const meatCategoryScore = MEAT_TERMS.has(term) && MEAT_CATEGORIES.has(category.join(" ")) ? 65 : 0;
    const match = Math.max(fieldScore(name, term) * 3, fieldScore(category, term), meatCategoryScore);
    if (!match) return -1;
    score += match;
  }
  const phrase = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(product.name || "");
  if (normalizedName === phrase) score += 1000;
  else if (normalizedName.startsWith(phrase)) score += 400;
  return score;
}

export function productMatchesSearch(product: SearchableProduct, query: string) {
  return productSearchScore(product, query) >= 0;
}

export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  if (!query.trim()) return products;
  return products.map((product, index) => ({ product, index, score: productSearchScore(product, query) }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ product }) => product);
}
