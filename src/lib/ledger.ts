import { Decimal } from "@prisma/client/runtime/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";

export type LedgerRow = {
  date: string;
  incomeLocalNet: number;
  incomeDeliveryNet: number;
  incomeTotalNet: number;
  expensesGross: number;
  paymentsTotal: number;
  pdvTotal: number;
  runningBalance: number;
};

type IncomeLike = {
  date: Date;
  amount: Decimal;
  channel: "DELIVERY" | "LOCAL";
  feeAmount: Decimal;
  netAmount: Decimal;
};

type ExpenseLike = {
  date: Date;
  grossAmount: Decimal;
  pdvAmount: Decimal;
};

type PaymentLike = {
  date: Date;
  amount: Decimal;
};

function decimal(value: Decimal | number | string) {
  return new Decimal(value);
}

function toNumber(value: Decimal) {
  return Number(value.toString());
}

export function buildDailyLedger({
  startingBalance,
  incomes,
  expenses,
  payments,
  from,
  to,
}: {
  startingBalance: Decimal;
  incomes: IncomeLike[];
  expenses: ExpenseLike[];
  payments: PaymentLike[];
  from: string;
  to: string;
}): LedgerRow[] {
  const days = eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to),
  });

  const incomeByDay = new Map<string, IncomeLike[]>();
  for (const income of incomes) {
    const key = format(income.date, "yyyy-MM-dd");
    incomeByDay.set(key, [...(incomeByDay.get(key) ?? []), income]);
  }

  const expenseByDay = new Map<string, ExpenseLike[]>();
  for (const expense of expenses) {
    const key = format(expense.date, "yyyy-MM-dd");
    expenseByDay.set(key, [...(expenseByDay.get(key) ?? []), expense]);
  }

  const paymentByDay = new Map<string, PaymentLike[]>();
  for (const payment of payments) {
    const key = format(payment.date, "yyyy-MM-dd");
    paymentByDay.set(key, [...(paymentByDay.get(key) ?? []), payment]);
  }

  let running = decimal(startingBalance);
  const rows: LedgerRow[] = [];

  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    const dayIncomes = incomeByDay.get(key) ?? [];
    const dayExpenses = expenseByDay.get(key) ?? [];
    const dayPayments = paymentByDay.get(key) ?? [];

    let incomeLocalNet = decimal(0);
    let incomeDeliveryNet = decimal(0);

    for (const income of dayIncomes) {
      if (income.channel === "LOCAL") {
        incomeLocalNet = incomeLocalNet.plus(income.netAmount);
      } else {
        incomeDeliveryNet = incomeDeliveryNet.plus(income.netAmount);
      }
    }

    const incomeTotalNet = incomeLocalNet.plus(incomeDeliveryNet);
    let expensesGross = decimal(0);
    let pdvTotal = decimal(0);

    for (const expense of dayExpenses) {
      expensesGross = expensesGross.plus(expense.grossAmount);
      pdvTotal = pdvTotal.plus(expense.pdvAmount);
    }

    let paymentsTotal = decimal(0);
    for (const payment of dayPayments) {
      paymentsTotal = paymentsTotal.plus(payment.amount);
    }

    const dailyNetChange = incomeTotalNet.minus(paymentsTotal);
    running = running.plus(dailyNetChange);

    rows.push({
      date: key,
      incomeLocalNet: toNumber(incomeLocalNet),
      incomeDeliveryNet: toNumber(incomeDeliveryNet),
      incomeTotalNet: toNumber(incomeTotalNet),
      expensesGross: toNumber(expensesGross),
      paymentsTotal: toNumber(paymentsTotal),
      pdvTotal: toNumber(pdvTotal),
      runningBalance: toNumber(running),
    });
  }

  return rows;
}
