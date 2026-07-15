"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, MessageCircleMore, Send } from "lucide-react";
import Link from "next/link";

type FormState = { name: string; company: string; whatsapp: string; email: string; businessType: string; };
const initialForm: FormState = { name: "", company: "", whatsapp: "", email: "", businessType: "" };

export default function DemoRequestForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const response = await fetch("/api/demo-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo enviar la solicitud.");
      setSuccess(true);
      if (result.whatsappUrl) window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
      setForm(initialForm);
    } catch (err: any) { setError(err?.message || "Ocurrió un error inesperado."); }
    finally { setLoading(false); }
  }

  if (success) return <div className="rounded-[2rem] border border-emerald-200 bg-white p-8 text-center shadow-2xl"><CheckCircle2 className="mx-auto text-emerald-500" size={54}/><h2 className="mt-5 text-3xl font-black text-[#071044]">Solicitud recibida</h2><p className="mt-3 leading-7 text-slate-600">Guardamos tus datos y abrimos WhatsApp para completar el contacto. También recibirás seguimiento por correo.</p><button onClick={() => setSuccess(false)} className="mt-7 rounded-2xl bg-violet-600 px-6 py-3 font-black text-white">Enviar otra solicitud</button></div>;

  return <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-2xl shadow-violet-950/10 sm:p-8"><Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-violet-600"><ArrowLeft size={17}/> Volver a Perla</Link><div className="mt-6"><div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-700"><MessageCircleMore size={17}/> Demo personalizada</div><h1 className="mt-5 text-4xl font-black tracking-tight text-[#071044]">Cuéntanos sobre tu negocio.</h1><p className="mt-3 leading-7 text-slate-600">Prepararemos una demostración enfocada en tus productos, pedidos y operación.</p></div><form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">{[
    ["name","Nombre","Carlos García","text"],["company","Empresa","Mercado Central","text"],["whatsapp","WhatsApp","+1 305 555 0100","tel"],["email","Email","contacto@empresa.com","email"]
  ].map(([key,label,placeholder,type]) => <label key={key} className="grid gap-2 text-sm font-black text-slate-700">{label}<input required type={type} value={form[key as keyof FormState]} onChange={(e)=>setForm({...form,[key]:e.target.value})} placeholder={placeholder} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"/></label>)}<label className="grid gap-2 text-sm font-black text-slate-700 sm:col-span-2">Tipo de negocio<select required value={form.businessType} onChange={(e)=>setForm({...form,businessType:e.target.value})} className="rounded-xl border border-slate-300 px-4 py-3 font-semibold outline-none focus:border-violet-500"><option value="">Selecciona una opción</option>{["Supermercado","Restaurante","Moda","Tecnología","Farmacia","Ferretería","Envíos","Otro"].map(x=><option key={x}>{x}</option>)}</select></label>{error && <div className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600 sm:col-span-2">{error}</div>}<button disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-4 font-black text-white shadow-lg disabled:opacity-60 sm:col-span-2">{loading ? <Loader2 className="animate-spin"/> : <Send/>}{loading ? "Enviando..." : "Solicitar demo"}</button></form></div>;
}
