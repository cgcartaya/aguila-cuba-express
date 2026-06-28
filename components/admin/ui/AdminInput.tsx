type AdminInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

export default function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: AdminInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[#0B1F4D] outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}