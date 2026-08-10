import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PHONE = "17862031226";
const OWNER_EMAIL = "carlosgarciacartaya@gmail.com";

function clean(value: unknown, max = 200) { return String(value || "").trim().slice(0, max); }

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = clean(body.name, 100); const company = clean(body.company, 120); const whatsapp = clean(body.whatsapp, 40); const email = clean(body.email, 160); const businessType = clean(body.businessType, 80);
    if (!name || !company || !whatsapp || !email || !businessType) return NextResponse.json({ error: "Completa todos los campos." }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Falta configurar Supabase en el servidor." }, { status: 500 });
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { error } = await supabase.from("demo_requests").insert({ name, company, whatsapp, email, business_type: businessType, source: "landing" });
    if (error) throw error;

    const message = `Hola, quiero solicitar una demo de Perla Marketplace.\n\nNombre: ${name}\nEmpresa: ${company}\nWhatsApp: ${whatsapp}\nEmail: ${email}\nTipo de negocio: ${businessType}`;
    const whatsappUrl = `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;

    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || "Perla Marketplace <onboarding@resend.dev>", to: [OWNER_EMAIL], reply_to: email, subject: `Nueva solicitud de demo: ${company}`, html: `<h2>Nueva solicitud de demo</h2><p><b>Nombre:</b> ${name}</p><p><b>Empresa:</b> ${company}</p><p><b>WhatsApp:</b> ${whatsapp}</p><p><b>Email:</b> ${email}</p><p><b>Tipo de negocio:</b> ${businessType}</p>` }) });
    }

    return NextResponse.json({ ok: true, whatsappUrl });
  } catch (error: any) { console.error("DEMO REQUEST ERROR", error); return NextResponse.json({ error: error?.message || "No se pudo guardar la solicitud." }, { status: 500 }); }
}
