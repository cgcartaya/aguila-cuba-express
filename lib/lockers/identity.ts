export const normalizeIdentification = (value: string) => value.trim().toUpperCase().replace(/[ -]+/g, "");

// Driver-license layouts, including commonly issued legacy variants.
// https://www.mvrdecoder.com/license-formats
const licenses: Record<string, string> = {
  AL: "\\d{1,8}", AK: "\\d{1,7}", AZ: "[A-Z]\\d{8}|\\d{9}", AR: "\\d{4,9}",
  CA: "[A-Z]\\d{7}", CO: "\\d{9}|[A-Z]\\d{3,6}|[A-Z]{2}\\d{2,5}", CT: "\\d{9}",
  DC: "\\d{7}|\\d{9}", DE: "\\d{1,7}", FL: "[A-Z]\\d{12}", GA: "\\d{7,9}",
  HI: "H\\d{8}|\\d{9}", ID: "[A-Z]{2}\\d{6}[A-Z]|\\d{9}", IL: "[A-Z]\\d{11,12}",
  IN: "[A-Z]\\d{9}|\\d{9,10}", IA: "\\d{3}[A-Z]{2}\\d{4}|\\d{9}",
  KS: "[A-Z]\\d{8}|\\d{9}|[A-Z]\\d[A-Z]\\d[A-Z]", KY: "[A-Z]\\d{8,9}|\\d{9}",
  LA: "\\d{1,9}", ME: "\\d{7,8}", MD: "[A-Z]\\d{12}", MA: "[A-Z]\\d{8}|[A-Z]{2}\\d{7}|\\d{9}",
  MI: "[A-Z]\\d{12}|[A-Z]\\d{10}", MN: "[A-Z]\\d{12}", MS: "\\d{9}",
  MO: "[A-Z]\\d{5,9}|\\d{8,9}[A-Z]{0,2}", MT: "[A-Z]{3}\\d{10}|\\d{9}|\\d{13,14}",
  NE: "[A-Z]\\d{6,8}", NV: "\\d{9,12}", NH: "[A-Z]{3}\\d{8}|\\d{2}[A-Z]{3}\\d{5}",
  NJ: "[A-Z]\\d{14}", NM: "\\d{8,9}", NY: "\\d{9}", NC: "\\d{1,12}",
  ND: "[A-Z]{3}\\d{6}|\\d{9}", OH: "[A-Z]{1,2}\\d{4,8}|\\d{8}", OK: "[A-Z]\\d{9}|\\d{9}",
  OR: "[A-Z]\\d{6}|\\d{1,9}", PA: "\\d{8}", RI: "\\d{7,8}|V\\d{6}",
  SC: "\\d{5,11}", SD: "\\d{6,10}", TN: "\\d{7,9}", TX: "\\d{8}",
  UT: "\\d{4,10}", VT: "\\d{8}|\\d{7}A", VA: "[A-Z]\\d{8,11}|\\d{9}",
  WA: "WDL[A-Z0-9]{9}|[A-Z]{5}\\d{3}[A-Z0-9]{2,4}",
  WV: "[A-Z]\\d{6}|[A-Z]{2}\\d{5}|\\d{7}", WI: "[A-Z]\\d{13}", WY: "\\d{9,10}",
};

export function identificationPattern(state: string, type: "license" | "state_id") {
  // Florida publishes the same layout for licenses and state IDs.
  return type === "state_id" ? (state === "FL" ? licenses.FL : undefined) : licenses[state];
}

export function validIdentification(state: string, type: "license" | "state_id", value: string) {
  const pattern = identificationPattern(state, type);
  return typeof pattern === "string" && new RegExp(`^(?:${pattern})$`).test(normalizeIdentification(value));
}
