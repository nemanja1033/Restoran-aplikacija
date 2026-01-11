import assert from "node:assert/strict";
import { test } from "node:test";
import { Decimal } from "@prisma/client/runtime/client";
import { buildDailyLedger } from "../src/lib/ledger";

test("buildDailyLedger calculates running balance from incomes and payments", () => {
  const ledger = buildDailyLedger({
    startingBalance: new Decimal("100"),
    incomes: [
      {
        date: new Date("2024-01-01"),
        amount: new Decimal("200"),
        channel: "LOCAL",
        feeAmount: new Decimal("0"),
        netAmount: new Decimal("200"),
      },
      {
        date: new Date("2024-01-02"),
        amount: new Decimal("100"),
        channel: "DELIVERY",
        feeAmount: new Decimal("10"),
        netAmount: new Decimal("90"),
      },
    ],
    expenses: [],
    payments: [
      {
        date: new Date("2024-01-01"),
        amount: new Decimal("50"),
      },
    ],
    from: "2024-01-01",
    to: "2024-01-02",
  });

  assert.equal(ledger.length, 2);
  assert.equal(ledger[0].runningBalance, 250);
  assert.equal(ledger[1].runningBalance, 340);
});
