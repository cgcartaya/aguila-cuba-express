"use client";

import { Check } from "lucide-react";

type Props = {
  step: number; // 1..4, paso actual
  accent: string;
};

const STEPS = ["Fecha", "Horario", "Mesa", "Datos"];

export default function ReservationSteps({ step, accent }: Props) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, i) => {
        const index = i + 1;
        const done = index < step;
        const active = index === step;

        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black transition"
                style={{
                  backgroundColor: done || active ? accent : "transparent",
                  border: done || active ? "none" : "2px solid currentColor",
                  color: done || active ? "#fff" : "inherit",
                  opacity: done || active ? 1 : 0.35,
                }}
              >
                {done ? <Check size={12} /> : index}
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wide"
                style={{ opacity: done || active ? 0.85 : 0.35 }}
              >
                {label}
              </span>
            </div>

            {index < STEPS.length && (
              <div
                className="mx-1.5 mb-4 h-0.5 flex-1 rounded-full transition"
                style={{ backgroundColor: done ? accent : "currentColor", opacity: done ? 1 : 0.15 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
