import { NextResponse } from "next/server";
import { getExpenses, getIncomes, getSettings } from "@/lib/data";
import { getAccountIdFromRequest } from "@/lib/auth";
import { buildDailyLedger } from "@/lib/ledger";
import { format, parseISO, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRange(searchParams: URLSearchParams) {
  const today = new Date();
  const defaultFrom = format(subDays(today, 29), "yyyy-MM-dd");
  const defaultTo = format(today, "yyyy-MM-dd");

  return {
    from: searchParams.get("from") ?? defaultFrom,
    to: searchParams.get("to") ?? defaultTo,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { from, to } = getRange(searchParams);
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const settings = await getSettings(accountId);
  const fromDate = parseISO(`${from}T00:00:00`);
  const [incomes, expenses, incomesBefore, expensesBefore] = await Promise.all([
    getIncomes(accountId, from, to),
    getExpenses(accountId, from, to),
    prisma.income.findMany({
      where: { accountId, date: { lt: fromDate } },
      select: { netAmount: true },
    }),
    prisma.expense.findMany({
      where: { accountId, date: { lt: fromDate } },
      select: { grossAmount: true, type: true, paidNow: true },
    }),
  ]);

  let openingDelta = new Decimal(0);
  for (const income of incomesBefore) {
    openingDelta = openingDelta.plus(income.netAmount);
  }
  for (const expense of expensesBefore) {
    const cashImpact = expense.type !== "SUPPLIER" || expense.paidNow;
    if (cashImpact) {
      openingDelta = openingDelta.minus(expense.grossAmount);
    }
  }

  const ledger = buildDailyLedger({
    startingBalance: settings.startingBalance.plus(openingDelta),
    incomes,
    expenses,
    from,
    to,
  });

  return NextResponse.json({
    settings,
    ledger,
  });
}
