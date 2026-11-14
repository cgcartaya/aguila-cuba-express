"use client";

import { useId, useRef, type ReactNode } from "react";

export default function LockerDialog({ label, title, children }: {
  label: string;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  return <>
    <button type="button" className="rounded-lg bg-blue-800 px-4 py-2.5 font-semibold text-white" onClick={() => dialog.current?.showModal()}>{label}</button>
    <dialog ref={dialog} aria-labelledby={heading} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/60 sm:p-7">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 id={heading} className="text-xl font-bold">{title}</h2>
        <button type="button" className="rounded-lg border border-slate-300 px-3 py-1" onClick={() => dialog.current?.close()}>Cerrar</button>
      </div>
      {children}
    </dialog>
  </>;
}
