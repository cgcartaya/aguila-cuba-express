"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";

type Props = {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  accent: string;
  daysAhead?: number;
};

function toISO(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number) {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function todayISO() {
  return toISO(new Date());
}

export default function DateChipPicker({ value, onChange, accent, daysAhead = 14 }: Props) {
  const [showCustom, setShowCustom] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: daysAhead }, (_, i) => addDays(today, i));
  const isCustomSelected = !days.some((d) => toISO(d) === value);

  return (
    <div>
      <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {days.map((day, i) => {
          const iso = toISO(day);
          const selected = value === iso;
          const label =
            i === 0 ? "Hoy" : i === 1 ? "Mañana" : day.toLocaleDateString("es", { weekday: "short" });

          return (
            <button
              key={iso}
              onClick={() => {
                onChange(iso);
                setShowCustom(false);
              }}
              className="flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 px-3.5 py-2 transition"
              style={{
                borderColor: selected ? accent : `${accent}33`,
                backgroundColor: selected ? accent : "transparent",
                color: selected ? "#fff" : "inherit",
                minWidth: 56,
              }}
            >
              <span className="text-[10px] font-bold uppercase opacity-80">{label}</span>
              <span className="text-base font-black">{day.getDate()}</span>
            </button>
          );
        })}

        <button
          onClick={() => setShowCustom((v) => !v)}
          className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-3.5 py-2"
          style={{
            borderColor: isCustomSelected ? accent : `${accent}33`,
            backgroundColor: isCustomSelected ? `${accent}18` : "transparent",
            minWidth: 56,
          }}
        >
          <CalendarPlus size={16} style={{ color: accent }} />
          <span className="text-[10px] font-bold opacity-70">Otra</span>
        </button>
      </div>

      {showCustom && (
        <input
          type="date"
          autoFocus
          min={todayISO()}
          value={isCustomSelected ? value : ""}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="mt-2 w-full rounded-2xl border-2 bg-transparent px-4 py-3 text-sm font-bold"
          style={{ borderColor: `${accent}33` }}
        />
      )}
    </div>
  );
}
