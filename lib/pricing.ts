export const VAT_RATE = 0.18;
export const GREETING_CARD_FEE = 8;

export function priceIncludingVat(priceBeforeVat: number): number {
  return priceBeforeVat * (1 + VAT_RATE);
}

export function formatCurrency(amount: number): string {
  return `₪${Math.round(amount).toLocaleString("he-IL")}`;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  extraFee: number;
  vat: number;
  total: number;
}

export function computeCartTotals(subtotal: number, discountPct: number, extraFee = 0): CartTotals {
  const discount = subtotal * discountPct;
  const taxable = subtotal - discount + extraFee;
  const vat = taxable * VAT_RATE;
  const total = taxable + vat;
  return { subtotal, discount, extraFee, vat, total };
}
