"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { useDeParisLanguage } from "@/components/deparis-i18n/DeParisLanguageProvider";

type Props = {
  value: string;
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

export default function DateChipPicker({
  value,
  onChange,
  accent,
  daysAhead = 14,
}: Props) {
  const { locale } = useDeParisLanguage();
  const [showCustom, setShowCustom] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: daysAhead }, (_, i) =>
    addDays(today, i)
  );
  const isCustomSelected = !days.some((d) => toISO(d) === value);

  return (
    <div className="min-w-0">
      <div className="relative">
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-2 sm:-mx-1 sm:px-1">
          {days.map((day, i) => {
            const iso = toISO(day);
            const selected = value === iso;
            const label =
              i === 0
                ? "Hoy"
                : i === 1
                ? "Mañana"
                : day.toLocaleDateString(locale === "en" ? "en-US" : "es", { weekday: "short" });

            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  onChange(iso);
                  setShowCustom(false);
                }}
                className="flex shrink-0 snap-start flex-col items-center justify-center rounded-xl border-2 px-2.5 py-2 transition active:scale-95 sm:rounded-2xl sm:px-3.5"
                style={{
                  borderColor: selected ? accent : `${accent}33`,
                  backgroundColor: selected ? accent : "#fff",
                  color: selected ? "#fff" : "inherit",
                  minWidth: 52,
                }}
              >
                <span className="text-[8px] font-bold uppercase opacity-80 sm:text-[10px]">
                  {label}
                </span>
                <span className="text-sm font-black sm:text-base">
                  {day.getDate()}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className="flex shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-white px-2.5 py-2 sm:rounded-2xl sm:px-3.5"
            style={{
              borderColor: isCustomSelected ? accent : `${accent}33`,
              backgroundColor: isCustomSelected ? `${accent}18` : "#fff",
              minWidth: 52,
            }}
          >
            <CalendarPlus size={15} style={{ color: accent }} />
            <span className="text-[8px] font-bold opacity-70 sm:text-[10px]">
              Otra
            </span>
          </button>
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 w-7 bg-gradient-to-l from-white/80 to-transparent sm:hidden" />
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
          className="mt-2 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold sm:rounded-2xl"
          style={{ borderColor: `${accent}33` }}
        />
      )}
    </div>
  );
}
