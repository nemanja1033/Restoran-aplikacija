import { NextResponse } from "next/server";
import { getExpenses, getRevenues, getSettings } from "@/lib/data";
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

  const settings = await getSettings();
  const [revenues, expenses] = await Promise.all([
    getRevenues(from, to),
    getExpenses(from, to),
  ]);

  const ledger = buildDailyLedger({
    openingBalance: settings.openingBalance,
    revenues,
    expenses,
    from,
    to,
  });

  return NextResponse.json({
    settings,
    ledger,
  });
}
