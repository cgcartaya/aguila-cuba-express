/* =========================================================
   PAÍSES PARA EL TELÉFONO DEL CLIENTE (checkout)
   ---------------------------------------------------------
   Se usa en PhoneCountryField para que el cliente elija su
   país con bandera, se le anteponga el código de marcado
   automáticamente (+34, +52, etc.) y se valide que la
   cantidad de dígitos tenga sentido para ese país.

   No confundir con el teléfono del destinatario en Cuba
   (ese siempre es +53, fijo, no necesita selector).
========================================================= */

export type PhoneCountry = {
  iso2: string; // para flagcdn.com
  name: string;
  dialCode: string; // con "+"
  digits: number; // cantidad esperada de dígitos del número nacional (sin el código de país)
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso2: "us", name: "Estados Unidos", dialCode: "+1", digits: 10 },
  { iso2: "cu", name: "Cuba", dialCode: "+53", digits: 8 },
  { iso2: "es", name: "España", dialCode: "+34", digits: 9 },
  { iso2: "mx", name: "México", dialCode: "+52", digits: 10 },
  { iso2: "gy", name: "Guyana", dialCode: "+592", digits: 7 },
  { iso2: "ca", name: "Canadá", dialCode: "+1", digits: 10 },
  { iso2: "ch", name: "Suiza", dialCode: "+41", digits: 9 },
  { iso2: "uy", name: "Uruguay", dialCode: "+598", digits: 8 },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0]; // Estados Unidos

export function findPhoneCountry(iso2: string): PhoneCountry {
  return PHONE_COUNTRIES.find((c) => c.iso2 === iso2) ?? DEFAULT_PHONE_COUNTRY;
}
