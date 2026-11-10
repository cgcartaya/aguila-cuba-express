import { NextResponse } from 'next/server';
import { getPublicTravelPackages } from '@/lib/services/travel-public';
export async function GET() {
  try {
    return NextResponse.json({ packages: await getPublicTravelPackages() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'No se pudo cargar el catálogo. Inténtalo de nuevo.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
