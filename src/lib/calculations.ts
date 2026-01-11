import { Decimal } from "@prisma/client/runtime/client";

export function calculatePdvBreakdown(grossAmount: Decimal, pdvPercent: Decimal) {
  const divisor = pdvPercent.div(100).plus(1);
  const netAmount = grossAmount.div(divisor);
  const pdvAmount = grossAmount.minus(netAmount);
  return { netAmount, pdvAmount };
}

export function calculateDeliveryFee(amount: Decimal, feePercent: Decimal) {
  const feeAmount = amount.mul(feePercent).div(100);
  const netAmount = amount.minus(feeAmount);
  return { feeAmount, netAmount };
}
