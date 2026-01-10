import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { BalanceChart } from "@/components/balance-chart";
import { Button } from "@/components/ui/button";
import { getExpenses, getRevenues, getSettings } from "@/lib/data";
import { buildDailyLedger } from "@/lib/ledger";
import { formatCurrency } from "@/lib/format";
import { format, subDays } from "date-fns";

export const runtime = "nodejs";

export default async function DashboardPage() {
  const today = new Date();
  const from = format(subDays(today, 29), "yyyy-MM-dd");
  const to = format(today, "yyyy-MM-dd");

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

  const latestRow = ledger[ledger.length - 1];
  const todayRow = ledger.find((row) => row.date === to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Pregled poslovanja</p>
          <h2 className="text-2xl font-semibold">Dobro došli nazad</h2>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/prihodi">Dodaj prihod</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/troskovi">Dodaj trošak</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Trenutno stanje računa"
          value={
            latestRow
              ? formatCurrency(latestRow.runningBalance, settings.currency)
              : formatCurrency(0, settings.currency)
          }
          hint="Uključuje sve promene do današnjeg dana"
        />
        <StatCard
          title="Neto prihod danas"
          value={
            todayRow
              ? formatCurrency(todayRow.totalRevenueNet, settings.currency)
              : formatCurrency(0, settings.currency)
          }
        />
        <StatCard
          title="Troškovi danas (sa računa)"
          value={
            todayRow
              ? formatCurrency(todayRow.expensesFromAccount, settings.currency)
              : formatCurrency(0, settings.currency)
          }
        />
        <StatCard
          title="Provizija dostave danas"
          value={
            todayRow
              ? formatCurrency(todayRow.deliveryFeeTotal, settings.currency)
              : formatCurrency(0, settings.currency)
          }
        />
      </div>

      <BalanceChart
        data={ledger.map((row) => ({
          date: row.date,
          value: row.runningBalance,
        }))}
      />
    </div>
  );
}
