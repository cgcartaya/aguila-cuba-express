export function normalizeProcedurePhone(value: string): string {
  const phone = value.replace(/[\s().-]/g, "");
  if (/^\d{10}$/.test(phone)) return "+1" + phone;
  if (/^1\d{10}$/.test(phone)) return "+" + phone;
  return phone;
}
