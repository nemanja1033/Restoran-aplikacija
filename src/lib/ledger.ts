import { Decimal } from "@prisma/client/runtime/client";
import { eachDayOfInterval, format, parseISO } from "date-fns";

export type LedgerRow = {
  date: string;
  incomeLocalNet: number;
  incomeDeliveryNet: number;
  incomeTotalNet: number;
  expensesCashTotal: number;
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
  contributionsAmount: Decimal;
  pdvAmount: Decimal;
  type: "SUPPLIER" | "SUPPLIER_PAYMENT" | "SALARY" | "OTHER";
  paidNow: boolean;
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
  from,
  to,
}: {
  startingBalance: Decimal;
  incomes: IncomeLike[];
  expenses: ExpenseLike[];
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

  let running = decimal(startingBalance);
  const rows: LedgerRow[] = [];

  for (const day of days) {
    const key = format(day, "yyyy-MM-dd");
    const dayIncomes = incomeByDay.get(key) ?? [];
    const dayExpenses = expenseByDay.get(key) ?? [];

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
    let expensesCashTotal = decimal(0);
    let pdvTotal = decimal(0);

    for (const expense of dayExpenses) {
      pdvTotal = pdvTotal.plus(expense.pdvAmount);
      const cashImpact = expense.type !== "SUPPLIER" || expense.paidNow;
      if (cashImpact) {
        const contributions =
          expense.type === "SALARY" ? expense.contributionsAmount : decimal(0);
        expensesCashTotal = expensesCashTotal.plus(expense.grossAmount).plus(contributions);
      }
    }

    const dailyNetChange = incomeTotalNet.minus(expensesCashTotal);
    running = running.plus(dailyNetChange);

    rows.push({
      date: key,
      incomeLocalNet: toNumber(incomeLocalNet),
      incomeDeliveryNet: toNumber(incomeDeliveryNet),
      incomeTotalNet: toNumber(incomeTotalNet),
      expensesCashTotal: toNumber(expensesCashTotal),
      pdvTotal: toNumber(pdvTotal),
      runningBalance: toNumber(running),
    });
  }

  return rows;
}
