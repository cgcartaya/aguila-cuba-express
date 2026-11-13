export const luxuryPlatformHost = 'luxury-travel-point.perlamarketplace.com';
export const luxuryCustomHost = 'luxurytravelpoint.com';

export const luxuryOrigin = 'https://' + luxuryCustomHost;

export function isLuxuryHost(host: string | null | undefined): boolean {
  const normalized = host?.trim().toLowerCase().split(':')[0].replace(/^www\./, '');
  return normalized === luxuryPlatformHost || normalized === luxuryCustomHost;
}
