"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function BillingDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-label={title}
      className="m-auto max-h-[90dvh] w-[min(720px,94vw)] overflow-auto rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/50"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </dialog>
  );
}
