import { z } from 'zod';
import { isLuxuryHost } from '@/lib/luxury/hosts';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { contact } from '@/components/landing/luxury/content';

const field = (max: number) => z.string().trim().max(max);
const inquiry = z.object({
  id: z.uuid(),
  kind: z.enum(['event', 'services', 'destination']),
  locale: z.enum(['en', 'es']),
  name: field(100).min(2),
  email: z.email().max(254),
  organization: field(120),
  phone: field(40),
  location: field(150),
  dates: field(100),
  size: field(12).regex(/^\d{0,8}$/),
  program: field(100).min(1),
  details: field(3000).min(10),
  website: z.literal(''),
});

export async function POST(request: Request) {
  const host = request.headers.get('host');
  if (!isLuxuryHost(host) || request.headers.get('origin') !== 'https://' + host) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const raw = await request.text();
  if (raw.length > 12000) return Response.json({ error: 'invalid' }, { status: 413 });
  let input: unknown;
  try { input = JSON.parse(raw); } catch { return Response.json({ error: 'invalid' }, { status: 400 }); }
  const parsed = inquiry.safeParse(input);
  if (!parsed.success) return Response.json({ error: 'invalid' }, { status: 400 });
  const { id, kind, locale, website, ...details } = parsed.data;
  if (website !== '') return Response.json({ error: 'invalid' }, { status: 400 });

  const { data: store, error: storeError } = await supabaseAdmin.from('stores')
    .select('id').eq('slug', 'luxury-travel-point').eq('is_active', true).maybeSingle();
  if (storeError || !store) return Response.json({ error: 'unavailable' }, { status: 503 });

  const { data: created, error } = await supabaseAdmin.from('dmc_inquiries')
    .upsert({ store_id: store.id, id, kind, locale, details }, { onConflict: 'store_id,id', ignoreDuplicates: true })
    .select('id').maybeSingle();
  if (error) {
    console.error('DMC inquiry persistence failed', error.code);
    return Response.json({ error: 'unavailable' }, { status: 503 });
  }

  if (created && process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'luxury-dmc/' + id,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: [contact.email],
          reply_to: details.email,
          subject: 'Luxury DMC inquiry · ' + kind,
          text: [`Reference: ${id}`, `Language: ${locale}`, ...Object.entries(details).map(([key, value]) => key + ': ' + value)].join('\n'),
        }),
        signal: AbortSignal.timeout(7000),
      });
      if (response.ok) {
        const update = await supabaseAdmin.from('dmc_inquiries').update({ notified_at: new Date().toISOString() })
          .eq('store_id', store.id).eq('id', id);
        if (update.error) console.error('DMC notification status update failed', update.error.code);
      } else {
        console.error('DMC notification rejected', response.status);
      }
    } catch {
      console.error('DMC notification request failed');
    }
  }

  return Response.json({ id }, { status: 201 });
}
