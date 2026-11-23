"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import s from "./module-demo.module.css";

const demos = {
  tienda: {
    intro: "Elige un producto y prueba cómo una compra pasa del catálogo al panel de pedidos.",
    choices: [{ label: "Galletas", value: 5 }, { label: "Olla eléctrica", value: 32 }],
    action: "Agregar al carrito",
    next: "Crear pedido",
    preview: (label: string, value: number) => `Carrito: 1 × ${label} · $${value.toFixed(2)}`,
    result: (label: string) => `Panel de pedidos · Pedido nuevo: 1 × ${label}`,
  },
  envios: {
    intro: "Selecciona el peso de un paquete y prueba una cotización con una tarifa de ejemplo de $5 por libra.",
    choices: [{ label: "5 lb", value: 5 }, { label: "10 lb", value: 10 }],
    action: "Calcular cotización",
    next: "Registrar envío",
    preview: (label: string, value: number) => `${label} × $5 por libra · Total: $${(value * 5).toFixed(2)}`,
    result: () => "Envío registrado · Rastreo DEMO-1048 · Pendiente de despacho",
  },
  restaurante: {
    intro: "Personaliza un plato con un modificador y envíalo al panel de pedidos.",
    choices: [{ label: "Con extra de queso", value: 12 }, { label: "Sin cebolla", value: 10 }],
    action: "Agregar hamburguesa",
    next: "Enviar pedido",
    preview: (label: string, value: number) => `Hamburguesa · ${label} · $${value.toFixed(2)}`,
    result: (label: string) => `Pedido de cocina · 1 hamburguesa · ${label}`,
  },
  landing: {
    intro: "Personaliza el título de una página y revisa cómo lo vería un visitante.",
    choices: [{ label: "Descubre nuevos destinos", value: 0 }, { label: "Planea tu próximo viaje", value: 0 }],
    action: "Ver vista previa",
    next: "Publicar en la demo",
    preview: (label: string) => `Portada · «${label}» · Botón de contacto`,
    result: (label: string) => `Vista publicada de ejemplo · «${label}»`,
  },
  shareapp: {
    intro: "Selecciona un gestor, genera su enlace y simula una visita a la campaña.",
    choices: [{ label: "Ana", value: 0 }, { label: "Luis", value: 0 }],
    action: "Generar enlace",
    next: "Simular visita",
    preview: (label: string) => `Enlace de campaña · /ofertas?gestor=${label.toLowerCase()}`,
    result: (label: string) => `Informe de alcance · 1 visita atribuida a ${label}`,
  },
  economia: {
    intro: "Prueba dos precios de venta y compara el margen de un producto con costo de $8.",
    choices: [{ label: "$10", value: 10 }, { label: "$16", value: 16 }],
    action: "Calcular margen",
    next: "Registrar precio en la demo",
    preview: (_label: string, value: number) => `Ganancia por unidad: $${(value - 8).toFixed(2)} · Margen: ${Math.round((value - 8) / value * 100)}%`,
    result: (label: string) => `Ficha del producto · Precio de venta registrado: ${label}`,
  },
};

export default function ModuleDemo({ id, title, onClose }: {
  id: keyof typeof demos;
  title: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState(0);
  const [step, setStep] = useState(0);
  const demo = demos[id];
  const choice = demo.choices[selection];

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog ref={dialog} className={s.dialog} aria-labelledby="module-demo-title" onClose={onClose}>
      <div className={s.header}>
        <div>
          <p>Demo interactiva · Datos de ejemplo</p>
          <h2 id="module-demo-title">{title}</h2>
        </div>
        <button type="button" className={s.close} aria-label="Cerrar demo" onClick={() => dialog.current?.close()}>
          <X size={21} aria-hidden="true" />
        </button>
      </div>
      <p className={s.intro}>{demo.intro}</p>
      <fieldset className={s.choices}>
        <legend>Selecciona una opción</legend>
        {demo.choices.map(({ label }, index) => (
          <label key={label}>
            <input type="radio" name="demo-choice" checked={selection === index} onChange={() => {
              setSelection(index);
              setStep(0);
            }} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className={s.result} role="status">
        {step === 1 && demo.preview(choice.label, choice.value)}
        {step === 2 && demo.result(choice.label)}
      </div>
      <button type="button" className={s.action} onClick={() => setStep(step === 2 ? 0 : step + 1)}>
        {step === 0 ? demo.action : step === 1 ? demo.next : "Repetir demo"}
        {step === 2 ? <RotateCcw size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
      </button>
    </dialog>
  );
}
