import { ArrowRight, Loader2 } from "lucide-react";

type Props = {
  total: number;
  step: 1 | 2;
  onBack?: () => void;
  onContinue: () => void;
  loading?: boolean;
};

export function CheckoutContinueBar({ total, step, onBack, onContinue, loading }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total estimado</p>
          <p className="truncate text-lg font-black text-[#061b3a]">${total.toFixed(2)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {step === 2 && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
            >
              Atrás
            </button>
          )}

          <button
            type="button"
            onClick={onContinue}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white shadow-md transition hover:bg-[#0a2657] disabled:opacity-60"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Continuar
            {!loading && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
