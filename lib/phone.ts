/** Israeli / international phone -> digits only with country code (054-1234567 -> 972541234567), or null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `972${digits.slice(1)}`;
  digits = digits.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** 972541234567 -> 0541234567 (the format Israeli SMS providers expect); other countries stay as they are. */
export function toLocalIsraeli(digits: string): string {
  return digits.startsWith("972") ? `0${digits.slice(3)}` : digits;
}
