import { Check } from "lucide-react";

type Props = {
  step: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
};

const STEPS: Array<{ id: 1 | 2 | 3; label: string }> = [
  { id: 1, label: "Tus datos" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pago" },
];

export function CheckoutSteps({ step, onStepClick }: Props) {
  return (
    <div className="mb-6 flex items-center gap-2 sm:gap-3">
      {STEPS.map((item, index) => {
        const isDone = item.id < step;
        const isCurrent = item.id === step;
        const isClickable = item.id <= step;

        return (
          <div key={item.id} className="flex flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(item.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${
                isCurrent
                  ? "bg-[#061b3a] text-white shadow-md"
                  : isDone
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "bg-slate-100 text-slate-400"
              } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                  isCurrent
                    ? "bg-white/20"
                    : isDone
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200"
                }`}
              >
                {isDone ? <Check size={12} /> : item.id}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>

            {index < STEPS.length - 1 && (
              <div
                className={`h-[2px] flex-1 rounded-full ${
                  item.id < step ? "bg-blue-300" : "bg-slate-100"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
