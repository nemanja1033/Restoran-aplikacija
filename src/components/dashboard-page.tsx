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
  suppliers: {
    id: number;
    number: number;
    name: string | null;
    outstanding: number;
    paidTotal: number;
  }[];
};

export function DashboardPage() {
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [supplierDebt, setSupplierDebt] = useState(0);
  const [supplierSummaries, setSupplierSummaries] = useState<SupplierSummaryResponse["suppliers"]>(
    []
  );

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
    setSupplierSummaries(supplierData.suppliers ?? []);
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
    <div className="space-y-8 sm:space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground max-w-[65ch]">Pregled poslovanja</p>
          <h2 className="max-w-[24ch] text-[clamp(1.6rem,4.5vw,2.25rem)] font-semibold leading-tight">
            Dobro došli nazad
          </h2>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/prihodi" prefetch>
              Dodaj prihod
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/troskovi" prefetch>
              Dodaj trošak
            </Link>
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

      <div className="rounded-2xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold">Dugovanja dobavljačima</h3>
            <p className="text-sm text-muted-foreground">
              Pregled dugovanja i uplata po dobavljaču
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/dobavljaci" prefetch>
              Svi dobavljači
            </Link>
          </Button>
        </div>
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3 font-medium">Dobavljač</th>
                  <th className="px-4 py-3 font-medium">Uplaćeno</th>
                  <th className="px-4 py-3 font-medium">Dugovanje</th>
                  <th className="px-4 py-3 font-medium text-right">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {supplierSummaries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      Nema unetih dobavljača.
                    </td>
                  </tr>
                ) : (
                  supplierSummaries.map((supplier) => (
                    <tr key={supplier.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <Link
                          href={`/dobavljaci/${supplier.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {supplier.name ?? `Dobavljač #${supplier.number}`}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(supplier.paidTotal, currency)}
                      </td>
                      <td className="px-4 py-3">
                        {formatCurrency(supplier.outstanding, currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/dobavljaci/${supplier.id}`}>Detalji</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="md:hidden">
          <div className="space-y-3 p-4">
            {supplierSummaries.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nema unetih dobavljača.
              </div>
            ) : (
              supplierSummaries.map((supplier) => (
                <div key={supplier.id} className="rounded-xl border bg-background p-4 shadow-sm">
                  <Link
                    href={`/dobavljaci/${supplier.id}`}
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    {supplier.name ?? `Dobavljač #${supplier.number}`}
                  </Link>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Uplaćeno</span>
                      <span>{formatCurrency(supplier.paidTotal, currency)}</span>
                    </div>
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-muted-foreground">Dugovanje</span>
                      <span>{formatCurrency(supplier.outstanding, currency)}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button size="sm" variant="outline" asChild className="w-full">
                      <Link href={`/dobavljaci/${supplier.id}`}>Detalji</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
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
