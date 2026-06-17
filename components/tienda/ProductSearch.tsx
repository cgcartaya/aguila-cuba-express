type ProductSearchProps = {
  busqueda: string;
  setBusqueda: (value: string) => void;
};

export default function ProductSearch({
  busqueda,
  setBusqueda,
}: ProductSearchProps) {
  return (
    <section className="py-4">
      <div className="flex items-center rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="mr-3 text-xl">🔍</span>

        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </section>
  );
}