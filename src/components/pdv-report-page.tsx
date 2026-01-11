"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { DateRangeFilter, DateRange } from "@/components/date-range-filter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type Expense = {
  id: number;
  date: string;
  grossAmount: string;
  netAmount: string;
  pdvAmount: string;
  type: "SUPPLIER" | "SALARY" | "OTHER";
  supplier: { id: number; name: string | null; number: number } | null;
};

type Settings = {
  currency: string;
};

export function PdvReportPage() {
  const [range, setRange] = useState<DateRange>({
    label: "30 dana",
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [expenseData, settingsData] = await Promise.all([
        apiFetch<Expense[]>(`/api/expenses?from=${range.from}&to=${range.to}`),
        apiFetch<Settings>("/api/settings"),
      ]);
      setExpenses(expenseData);
      setSettings(settingsData);
    } catch {
      toast.error("Neuspešno učitavanje PDV izveštaja.");
    }
  }, [range.from, range.to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currency = settings?.currency ?? "RSD";

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, expense) => {
        acc.gross += Number(expense.grossAmount);
        acc.net += Number(expense.netAmount);
        acc.pdv += Number(expense.pdvAmount);
        return acc;
      },
      { gross: 0, net: 0, pdv: 0 }
    );
  }, [expenses]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; net: number; pdv: number }>();
    for (const expense of expenses) {
      const key = expense.supplier
        ? `${expense.supplier.id}`
        : "other";
      const name = expense.supplier
        ? expense.supplier.name ?? `Dobavljač #${expense.supplier.number}`
        : "Ostalo";
      const entry = map.get(key) ?? { name, gross: 0, net: 0, pdv: 0 };
      entry.gross += Number(expense.grossAmount);
      entry.net += Number(expense.netAmount);
      entry.pdv += Number(expense.pdvAmount);
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [expenses]);

  const byType = useMemo(() => {
    const map = new Map<string, { label: string; gross: number; net: number; pdv: number }>();
    for (const expense of expenses) {
      const key = expense.type;
      const label =
        expense.type === "SUPPLIER"
          ? "Dobavljač"
          : expense.type === "SALARY"
          ? "Plate"
          : "Ostalo";
      const entry = map.get(key) ?? { label, gross: 0, net: 0, pdv: 0 };
      entry.gross += Number(expense.grossAmount);
      entry.net += Number(expense.netAmount);
      entry.pdv += Number(expense.pdvAmount);
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [expenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Izveštaj za izabrani period</p>
          <h2 className="text-2xl font-semibold">PDV izveštaj</h2>
        </div>
        <DateRangeFilter active={range.label} onChange={setRange} />
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm">
        <div className="flex flex-wrap gap-6">
          <div>
            <div className="text-muted-foreground">Ukupno bruto</div>
            <div className="font-semibold">{formatCurrency(totals.gross, currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ukupno neto</div>
            <div className="font-semibold">{formatCurrency(totals.net, currency)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Ukupno PDV</div>
            <div className="font-semibold">{formatCurrency(totals.pdv, currency)}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card">
          <div className="border-b px-4 py-3 text-sm font-semibold">Po dobavljaču</div>
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Dobavljač</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>PDV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bySupplier.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Nema podataka za izabrani period.
                    </TableCell>
                  </TableRow>
                ) : (
                  bySupplier.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{formatCurrency(row.gross, currency)}</TableCell>
                      <TableCell>{formatCurrency(row.net, currency)}</TableCell>
                      <TableCell>{formatCurrency(row.pdv, currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card">
          <div className="border-b px-4 py-3 text-sm font-semibold">Po tipu troška</div>
          <div className="overflow-x-auto">
            <Table className="min-w-[520px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>PDV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byType.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Nema podataka za izabrani period.
                    </TableCell>
                  </TableRow>
                ) : (
                  byType.map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell>{formatCurrency(row.gross, currency)}</TableCell>
                      <TableCell>{formatCurrency(row.net, currency)}</TableCell>
                      <TableCell>{formatCurrency(row.pdv, currency)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3 text-sm font-semibold">Detalji troškova</div>
        <div className="overflow-x-auto">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Dobavljač</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Bruto</TableHead>
                <TableHead>Neto</TableHead>
                <TableHead>PDV</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Nema podataka za izabrani period.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      {expense.supplier
                        ? expense.supplier.name ?? `Dobavljač #${expense.supplier.number}`
                        : "Ostalo"}
                    </TableCell>
                    <TableCell>
                      {expense.type === "SUPPLIER"
                        ? "Dobavljač"
                        : expense.type === "SALARY"
                        ? "Plate"
                        : "Ostalo"}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(expense.grossAmount), currency)}</TableCell>
                    <TableCell>{formatCurrency(Number(expense.netAmount), currency)}</TableCell>
                    <TableCell>{formatCurrency(Number(expense.pdvAmount), currency)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
