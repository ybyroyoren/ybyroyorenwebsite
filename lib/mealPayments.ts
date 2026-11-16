// Open-meal payments for one booking: what was paid, what is still due as deposit, and what is left for the day of the
// meal. Pure arithmetic, used by the admin screen. The deposit is DEPOSIT_PER_SEAT per diner; discounts come off the
// deposit (deposit discount) or off the rest of the meal price (balance discount).

export const DEPOSIT_PER_SEAT = 100;

export interface PaymentInput {
  seats: number;
  pricePerSeat: number;
  /** Paid so far toward the deposit (or more). */
  paidAmount: number;
  depositDiscount: number;
  balanceDiscount: number;
}

export interface PaymentBreakdown {
  mealTotal: number;
  /** The meal after both discounts. */
  netTotal: number;
  /** The deposit that has to be paid (after its discount). */
  depositDue: number;
  paid: number;
  remainingDeposit: number;
  remainingAtEvent: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function paymentBreakdown(i: PaymentInput): PaymentBreakdown {
  const mealTotal = i.pricePerSeat * i.seats;
  const depositDue = Math.max(0, DEPOSIT_PER_SEAT * i.seats - i.depositDiscount);
  const netTotal = Math.max(0, mealTotal - i.depositDiscount - i.balanceDiscount);
  const remainingDeposit = Math.max(0, depositDue - i.paidAmount);
  // Anything paid beyond the deposit already reduces what is left for the day of the meal.
  const remainingTotal = Math.max(0, netTotal - i.paidAmount);
  const remainingAtEvent = Math.max(0, remainingTotal - remainingDeposit);
  return {
    mealTotal: round2(mealTotal),
    netTotal: round2(netTotal),
    depositDue: round2(depositDue),
    paid: round2(i.paidAmount),
    remainingDeposit: round2(remainingDeposit),
    remainingAtEvent: round2(remainingAtEvent),
  };
}
