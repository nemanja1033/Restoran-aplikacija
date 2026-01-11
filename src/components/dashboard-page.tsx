"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StatCard } from "@/components/stat-card";
import { BalanceChart } from "@/components/balance-chart";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { apiFetch } from "@/lib/api-client";
import { format, subDays } from "date-fns";

const REFRESH_MS = 30000;

type LedgerRow = {
  date: string;
  totalRevenueNet: number;
  expensesFromAccount: number;
  deliveryFeeTotal: number;
  runningBalance: number;
};

type Settings = {
  currency: string;
};

export function DashboardPage() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const range = useMemo(() => {
    const today = new Date();
    return {
      from: format(subDays(today, 29), "yyyy-MM-dd"),
      to: format(today, "yyyy-MM-dd"),
    };
  }, []);

  const loadData = useCallback(async () => {
    const data = await apiFetch<{ settings: Settings; ledger: LedgerRow[] }>(
      `/api/ledger?from=${range.from}&to=${range.to}`
    );
    setLedger(data.ledger);
    setSettings(data.settings);
  }, [range.from, range.to]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData]);

  useEffect(() => {
    const handleUpdate = () => loadData();
    window.addEventListener("finance-data-updated", handleUpdate);
    return () => window.removeEventListener("finance-data-updated", handleUpdate);
  }, [loadData]);

  const latestRow = ledger[ledger.length - 1];
  const todayRow = ledger.find((row) => row.date === range.to);
  const currency = settings?.currency ?? "RSD";

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
              ? formatCurrency(latestRow.runningBalance, currency)
              : formatCurrency(0, currency)
          }
          hint="Uključuje sve promene do današnjeg dana"
        />
        <StatCard
          title="Neto prihod danas"
          value={
            todayRow
              ? formatCurrency(todayRow.totalRevenueNet, currency)
              : formatCurrency(0, currency)
          }
        />
        <StatCard
          title="Troškovi danas (sa računa)"
          value={
            todayRow
              ? formatCurrency(todayRow.expensesFromAccount, currency)
              : formatCurrency(0, currency)
          }
        />
        <StatCard
          title="Provizija dostave danas"
          value={
            todayRow
              ? formatCurrency(todayRow.deliveryFeeTotal, currency)
              : formatCurrency(0, currency)
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
