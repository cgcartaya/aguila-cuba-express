export const wfCargoHost = "wfcargoenviospsl.com";
export const wfCargoPlatformHost = "wf-cargo.perlamarketplace.com";
export const wfCargoOrigin = `https://${wfCargoHost}`;

export function isWfCargoHost(host: string) {
  return host === wfCargoHost || host === wfCargoPlatformHost;
}
