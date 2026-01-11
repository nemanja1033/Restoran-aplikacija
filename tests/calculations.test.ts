import assert from "node:assert/strict";
import { test } from "node:test";
import { Decimal } from "@prisma/client/runtime/client";
import { calculateDeliveryFee, calculatePdvBreakdown } from "../src/lib/calculations";

test("calculatePdvBreakdown splits gross into net + pdv", () => {
  const gross = new Decimal("1200");
  const pdvPercent = new Decimal("20");
  const { netAmount, pdvAmount } = calculatePdvBreakdown(gross, pdvPercent);

  assert.equal(netAmount.toFixed(2), "1000.00");
  assert.equal(pdvAmount.toFixed(2), "200.00");
});

test("calculateDeliveryFee computes fee and net", () => {
  const amount = new Decimal("1000");
  const feePercent = new Decimal("20");
  const { feeAmount, netAmount } = calculateDeliveryFee(amount, feePercent);

  assert.equal(feeAmount.toFixed(2), "200.00");
  assert.equal(netAmount.toFixed(2), "800.00");
});
