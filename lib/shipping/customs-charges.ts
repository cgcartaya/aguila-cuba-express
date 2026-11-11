export type CustomsCharge = { description: string; amount: number };

export function normalizeCustomsCharges(charges: CustomsCharge[] = []): CustomsCharge[] {
  if (charges.length > 100) throw new Error("Puedes añadir hasta 100 cargos aduanales.");
  return charges.map(({ description, amount }) => {
    const name = description.trim();
    const cents = Math.round(amount * 100);
    if (!name || name.length > 160 || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(cents / 100 - amount) > 1e-8) {
      throw new Error("Cada cargo aduanal necesita un artículo y un importe positivo con hasta dos decimales.");
    }
    return { description: name, amount: cents / 100 };
  });
}

export function customsChargesTotal(charges: CustomsCharge[]) {
  return charges.reduce((cents, charge) => cents + Math.round(charge.amount * 100), 0) / 100;
}
