import { getLuxuryShipping } from '@/lib/luxury/shipping-public';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    return Response.json(await getLuxuryShipping(), { headers });
  } catch {
    return Response.json({ error: 'Catalog unavailable' }, { status: 503, headers });
  }
}
