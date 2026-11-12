import { NextRequest, NextResponse } from 'next/server';
import { drainRemittanceWhatsapp } from '@/lib/notifications/alvarez-remittance-whatsapp';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  try {
    const result = await drainRemittanceWhatsapp();
    if ('reason' in result) console.warn('[alvarez-remittances-whatsapp] blocked', result.reason);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch { return NextResponse.json({ error: 'No se pudo procesar la cola.' }, { status: 503 }); }
}
