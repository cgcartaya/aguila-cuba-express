"use client";
import { useState } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import { shipping, whatsapp } from "./content";
import s from "./wfcargo.module.css";
export default function ShippingCalculator() {
  const [mode, setMode] = useState("weight");
  const [weight, setWeight] = useState("");
  const [box, setBox] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [result, setResult] = useState<number | null>(null);
  const reset = () => setResult(null);
  return (
    <section id="cotizador" className={s.tool}>
      <div className={s.toolHeading}>
        <Calculator />
        <div>
          <span>PLANIFICA TU ENVÍO</span>
          <h2>Cotiza tu envío a Cuba</h2>
        </div>
      </div>
      <form
        className={s.toolBody}
        onSubmit={(e) => {
          e.preventDefault();
          setResult(
            mode === "weight"
              ? Number(weight) * shipping.perPound
              : shipping.boxes[Number(box)].price * Number(quantity),
          );
        }}
      >
        <label>
          Destino
          <select>
            <option>Cuba · Marítimo</option>
          </select>
        </label>
        <label>
          Modalidad
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              reset();
            }}
          >
            <option value="weight">Por libra · $1.50/lb</option>
            <option value="box">Caja a precio fijo · Hasta 100 lb</option>
          </select>
        </label>
        {mode === "weight" ? (
          <label>
            Peso total (lb)
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ej. 20"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                reset();
              }}
            />
          </label>
        ) : (
          <div className={s.formGrid}>
            <label>
              Tamaño de caja (pulgadas)
              <select
                value={box}
                onChange={(e) => {
                  setBox(e.target.value);
                  reset();
                }}
              >
                {shipping.boxes.map((b, i) => (
                  <option key={b.size} value={i}>
                    {b.size} · ${b.price}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad de cajas
              <input
                required
                type="number"
                min="1"
                max="100"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  reset();
                }}
              />
            </label>
          </div>
        )}
        <button className={s.button} type="submit">
          Calcular estimado
          <ArrowRight size={18} />
        </button>
        <div aria-live="polite">
          {result !== null && (
            <div className={s.quoteResult}>
              <span>Transporte estimado</span>
              <strong>${result.toFixed(2)} USD</strong>
              <a
                href={whatsapp(
                  `Hola, quiero confirmar una cotización a Cuba: ${mode === "weight" ? `${weight} lb` : `${quantity} caja(s) de ${shipping.boxes[Number(box)].size} pulgadas`}. Transporte estimado: $${result.toFixed(2)}.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Confirmar cotización por WhatsApp →
              </a>
            </div>
          )}
        </div>
        <p className={s.small}>
          Entrega a domicilio en Cuba incluida. Empaque: $5 por visita, sujeto a
          exoneración. Aranceles, restricciones y condiciones se confirman con
          la agencia. Este cálculo no es una reserva ni una tarifa final.
        </p>
        <a
          className={s.textLink}
          href={whatsapp(
            "Hola, quisiera cotizar un envío a República Dominicana o Colombia.",
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          ¿Envías a República Dominicana o Colombia? Consúltanos →
        </a>
      </form>
    </section>
  );
}
