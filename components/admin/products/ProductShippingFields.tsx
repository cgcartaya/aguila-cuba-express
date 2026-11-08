"use client";
type Value = {
  weight: string;
  weight_unit: "g" | "lb" | "kg";
  platform_fee_exempt: boolean;
};
export default function ProductShippingFields({
  value,
  onChange,
}: {
  value: Value;
  onChange: (patch: Partial<Value>) => void;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <legend className="px-2 font-semibold">Peso y comisión</legend>
      <p className="text-sm text-slate-600">
        Peso de una unidad del producto, incluido su empaque. Se utilizará para
        calcular el envío.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          Peso
          <input
            className="mt-1 w-full rounded-lg border p-3"
            type="number"
            min="0.000001"
            step="any"
            value={value.weight}
            onChange={(e) => onChange({ weight: e.target.value })}
            placeholder="Sin configurar"
          />
        </label>
        <label className="text-sm">
          Unidad de peso
          <select
            className="mt-1 w-full rounded-lg border p-3"
            value={value.weight_unit}
            onChange={(e) =>
              onChange({ weight_unit: e.target.value as Value["weight_unit"] })
            }
          >
            <option value="g">Gramos (g)</option>
            <option value="lb">Libras (lb)</option>
            <option value="kg">Kilogramos (kg)</option>
          </select>
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={value.platform_fee_exempt}
          onChange={(e) => onChange({ platform_fee_exempt: e.target.checked })}
          className="mt-1"
        />
        <span>
          No aplicar la comisión porcentual de la tienda a este producto.
          <small className="mt-1 block text-slate-500">
            El cliente paga el precio base. El cargo fijo por orden se mantiene.
          </small>
        </span>
      </label>
    </fieldset>
  );
}
