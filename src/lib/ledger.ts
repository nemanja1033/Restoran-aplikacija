import { Prisma } from "@prisma/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";

export type LedgerRow = {
  date: string;
  totalInStoreGross: number;
  totalDeliveryGross: number;
  deliveryFeeTotal: number;
  deliveryNet: number;
  totalRevenueNet: number;
  expensesFromAccount: number;
  expensesCash: number;
  dailyNetChangeOnAccount: number;
  runningBalance: number;
};

type RevenueLike = {
  date: Date;
  amount: Prisma.Decimal;
  type: "DELIVERY" | "IN_STORE";
  feePercent: Prisma.Decimal;
};

type ExpenseLike = {
  date: Date;
  amount: Prisma.Decimal;
  paymentMethod: "ACCOUNT" | "CASH";
};

function decimal(value: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(value);
}

function toNumber(value: Prisma.Decimal) {
  return Number(value.toString());
}

export function buildDailyLedger({
  openingBalance,
  revenues,
  expenses,
  from,
  to,
}: {
  openingBalance: Prisma.Decimal;
  revenues: RevenueLike[];
  expenses: ExpenseLike[];
  from: string;
  to: string;
}): LedgerRow[] {
  const days = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  });

  const revenueByDay = new Map<string, RevenueLike[]>();
  for (const revenue of revenues) {
    const key = format(revenue.date, "yyyy-MM-dd");
    revenueByDay.set(key, [...(revenueByDay.get(key) ?? []), revenue]);
  }

  const expenseByDay = new Map<string, ExpenseLike[]>();
  for (const expense of expenses) {
    const key = format(expense.date, "yyyy-MM-dd");
    expenseByDay.set(key, [...(expenseByDay.get(key) ?? []), expense]);
  }

  let running = decimal(openingBalance);
  const rows: LedgerRow[] = [];

  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    const dayRevenues = revenueByDay.get(key) ?? [];
    const dayExpenses = expenseByDay.get(key) ?? [];

    let totalInStoreGross = decimal(0);
    let totalDeliveryGross = decimal(0);
    let deliveryFeeTotal = decimal(0);

    for (const revenue of dayRevenues) {
      if (revenue.type === "IN_STORE") {
        totalInStoreGross = totalInStoreGross.plus(revenue.amount);
      } else {
        totalDeliveryGross = totalDeliveryGross.plus(revenue.amount);
        const fee = revenue.amount
          .mul(revenue.feePercent)
          .div(100);
        deliveryFeeTotal = deliveryFeeTotal.plus(fee);
      }
    }

    const deliveryNet = totalDeliveryGross.minus(deliveryFeeTotal);
    const totalRevenueNet = totalInStoreGross.plus(deliveryNet);

    let expensesFromAccount = decimal(0);
    let expensesCash = decimal(0);

    for (const expense of dayExpenses) {
      if (expense.paymentMethod === "ACCOUNT") {
        expensesFromAccount = expensesFromAccount.plus(expense.amount);
      } else {
        expensesCash = expensesCash.plus(expense.amount);
      }
    }

    const dailyNetChangeOnAccount = totalRevenueNet.minus(expensesFromAccount);
    running = running.plus(dailyNetChangeOnAccount);

    rows.push({
      date: key,
      totalInStoreGross: toNumber(totalInStoreGross),
      totalDeliveryGross: toNumber(totalDeliveryGross),
      deliveryFeeTotal: toNumber(deliveryFeeTotal),
      deliveryNet: toNumber(deliveryNet),
      totalRevenueNet: toNumber(totalRevenueNet),
      expensesFromAccount: toNumber(expensesFromAccount),
      expensesCash: toNumber(expensesCash),
      dailyNetChangeOnAccount: toNumber(dailyNetChangeOnAccount),
      runningBalance: toNumber(running),
    });
  }

  return rows;
}
