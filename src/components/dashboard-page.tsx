"use client";

import { useCallback, useEffect, useState } from "react";
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
  incomeTotalNet: number;
  expensesCashTotal: number;
  pdvTotal: number;
  runningBalance: number;
};

type Settings = {
  currency: string;
};

type SupplierSummaryResponse = {
  totalOutstanding: number;
};

export function DashboardPage() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [supplierDebt, setSupplierDebt] = useState(0);

  const [range, setRange] = useState({ from: "", to: "" });

  const loadData = useCallback(async () => {
    if (!range.from || !range.to) return;
    const [ledgerData, supplierData] = await Promise.all([
      apiFetch<{ settings: Settings; ledger: LedgerRow[] }>(
        `/api/ledger?from=${range.from}&to=${range.to}`
      ),
      apiFetch<SupplierSummaryResponse>("/api/suppliers?summary=1"),
    ]);
    setLedger(ledgerData.ledger);
    setSettings(ledgerData.settings);
    setSupplierDebt(supplierData.totalOutstanding);
  }, [range.from, range.to]);

  useEffect(() => {
    if (!range.from || !range.to) {
      const today = new Date();
      setRange({
        from: format(subDays(today, 29), "yyyy-MM-dd"),
        to: format(today, "yyyy-MM-dd"),
      });
      return;
    }
    loadData();
    const id = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(id);
  }, [loadData, range.from, range.to]);

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
          title="Prihodi danas"
          value={
            todayRow
              ? formatCurrency(todayRow.incomeTotalNet, currency)
              : formatCurrency(0, currency)
          }
        />
        <StatCard
          title="Troškovi danas (gotovina)"
          value={
            todayRow
              ? formatCurrency(todayRow.expensesCashTotal, currency)
              : formatCurrency(0, currency)
          }
        />
        <StatCard
          title="PDV danas"
          value={
            todayRow
              ? formatCurrency(todayRow.pdvTotal, currency)
              : formatCurrency(0, currency)
          }
        />
        <StatCard
          title="Dugovanja dobavljačima"
          value={formatCurrency(supplierDebt, currency)}
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
