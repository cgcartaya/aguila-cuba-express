"use client";

type Props = {
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
};

export default function ProductPagination({
  page,
  totalPages,
  setPage,
}: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
      <button
        disabled={page === 1}
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        Anterior
      </button>

      <p className="text-sm text-slate-500">
        {page} / {totalPages}
      </p>

      <button
        disabled={page === totalPages}
        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        Siguiente
      </button>
    </div>
  );
}