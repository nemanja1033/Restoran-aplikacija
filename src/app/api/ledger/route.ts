import { NextResponse } from "next/server";
import { getExpenses, getIncomes, getSettings } from "@/lib/data";
import { getSessionAccountId } from "@/lib/auth";
import { buildDailyLedger } from "@/lib/ledger";
import { format, subDays } from "date-fns";

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
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const settings = await getSettings(accountId);
  const [incomes, expenses] = await Promise.all([
    getIncomes(accountId, from, to),
    getExpenses(accountId, from, to),
  ]);

  const ledger = buildDailyLedger({
    startingBalance: settings.startingBalance,
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
