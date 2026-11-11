/** Luxury Travel Point residential pickup coverage. */
export const LUXURY_PICKUP_STORE_SLUG = "luxury-travel-point";
export const LUXURY_PICKUP_CITY_ZIPS: Record<string, readonly string[]> = {
  "Lehigh Acres": [
    "33936",
    "33971",
    "33972",
    "33973",
    "33974",
    "33976"
  ],
  "Fort Myers": [
    "33901",
    "33905",
    "33907",
    "33908",
    "33912",
    "33913",
    "33916",
    "33919",
    "33965",
    "33966",
    "33967"
  ],
  "North Fort Myers": [
    "33903",
    "33917"
  ],
  "Cape Coral": [
    "33904",
    "33909",
    "33914",
    "33990",
    "33991",
    "33993"
  ],
  "LaBelle": [
    "33935"
  ],
  "Bonita Springs": [
    "34134",
    "34135"
  ],
  "Estero": [
    "33928",
    "33967"
  ]
};
export const LUXURY_PICKUP_CITIES = Object.keys(LUXURY_PICKUP_CITY_ZIPS);
export const LUXURY_PICKUP_ZIPS = [...new Set(Object.values(LUXURY_PICKUP_CITY_ZIPS).flat())].sort();
export function luxuryPickupZipMatchesCity(city: string, postalCode: string): boolean {
  const zip = postalCode.trim().match(/^\d{5}(?:-\d{4})?$/)?.[0].slice(0, 5);
  const selected = LUXURY_PICKUP_CITIES.find(name => name.toLowerCase() === city.trim().toLowerCase());
  return Boolean(zip && selected && LUXURY_PICKUP_CITY_ZIPS[selected].includes(zip));
}
