import { City, Country, State } from "country-state-city";

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
  const seen = new Set<string>();
  return City.getCitiesOfState(countryCode, stateCode)
    .filter((city) => {
      const key = city.name.trim().toLocaleLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((city) => ({ value: city.name, label: city.name, latitude: city.latitude, longitude: city.longitude }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function getCountryName(countryCode: string) {
  return Country.getCountryByCode(countryCode)?.name || countryCode;
}

export function getStateName(countryCode: string, stateCode: string) {
  return State.getStateByCodeAndCountry(stateCode, countryCode)?.name || stateCode;
}
