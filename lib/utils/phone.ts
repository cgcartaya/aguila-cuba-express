
export function normalizeCustomerPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits;
}

export function isValidCustomerPhone(value: string) {
  const normalized = normalizeCustomerPhone(value);
  return normalized.length >= 8 && normalized.length <= 15;
}
