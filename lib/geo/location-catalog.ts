import { City, Country, State } from "country-state-city";
import southCarolina from "./data/south-carolina-places.json";

export type GeoOption = { value: string; label: string; latitude?: string | null; longitude?: string | null };

export function getCountryOptions(): GeoOption[] {
  return Country.getAllCountries()
    .map((country) => ({ value: country.isoCode, label: country.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getStateOptions(countryCode: string): GeoOption[] {
  if (!countryCode) return [];
  return State.getStatesOfCountry(countryCode)
    .map((state) => ({ value: state.isoCode, label: state.name, latitude: state.latitude, longitude: state.longitude }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCityOptions(countryCode: string, stateCode: string): GeoOption[] {
  if (!countryCode || !stateCode) return [];
  const isSouthCarolina = countryCode === "US" && stateCode === "SC";
  const options: GeoOption[] = City.getCitiesOfState(countryCode, stateCode)
    // The upstream list mixes counties into its South Carolina cities.
    .filter((city) => !isSouthCarolina || !/\sCounty$/i.test(city.name))
    .map((city) => ({ value: city.name, label: city.name, latitude: city.latitude, longitude: city.longitude }));
  if (isSouthCarolina) {
    options.push(...southCarolina.places.map((place) => ({
      value: place.name, label: place.name,
      latitude: String(place.latitude), longitude: String(place.longitude),
    })));
  }
  const seen = new Set<string>();
  return options
    .filter((city) => {
      const key = city.value.trim().toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCountryName(countryCode: string) {
  return Country.getCountryByCode(countryCode)?.name || countryCode;
}

export function getStateName(countryCode: string, stateCode: string) {
  return State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode;
}
