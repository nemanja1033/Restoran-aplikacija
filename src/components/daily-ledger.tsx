"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { DateRangeFilter, DateRange } from "@/components/date-range-filter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RevenueForm, RevenueFormValues } from "@/components/revenue-form";
import { ExpenseForm, ExpenseFormValues, SupplierOption } from "@/components/expense-form";
import { toast } from "sonner";

const emptyLedger: LedgerRow[] = [];

type LedgerRow = {
  date: string;
  incomeLocalNet: number;
  incomeDeliveryNet: number;
  incomeTotalNet: number;
  expensesGross: number;
  paymentsTotal: number;
  pdvTotal: number;
  runningBalance: number;
};

type Settings = {
  currency: string;
  deliveryFeePercent: string;
  defaultPdvPercent: string;
};

type Revenue = {
  id: number;
  date: string;
  amount: string;
  channel: "DELIVERY" | "LOCAL";
  feePercentApplied: string;
  feeAmount: string;
  netAmount: string;
  note: string | null;
};

type Expense = {
  id: number;
  date: string;
  grossAmount: string;
  netAmount: string;
  pdvPercent: string;
  pdvAmount: string;
  type: "SUPPLIER" | "SALARY" | "OTHER";
  receiptId?: number | null;
  note: string | null;
  supplier: SupplierOption | null;
  paidNow: boolean;
  receipt?: { storagePath: string };
};

export function DailyLedger() {
  const [range, setRange] = useState<DateRange>({
    label: "30 dana",
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [ledger, setLedger] = useState<LedgerRow[]>(emptyLedger);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [editingRevenue, setEditingRevenue] = useState<RevenueFormValues | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseFormValues | null>(null);
  const [showDelete, setShowDelete] = useState<{ type: "revenue" | "expense"; id: number } | null>(null);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ settings: Settings; ledger: LedgerRow[] }>(
        `/api/ledger?from=${range.from}&to=${range.to}`
      );
      setLedger(data.ledger);
      setSettings(data.settings);
    } catch {
      toast.error("Neuspešno učitavanje dnevnog pregleda.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await apiFetch<SupplierOption[]>("/api/suppliers");
      setSuppliers(data);
    } catch {
      toast.error("Neuspešno učitavanje dobavljača.");
    }
  }, []);

  const fetchDayDetails = useCallback(async (date: string) => {
    try {
      const [revenuesData, expensesData] = await Promise.all([
        apiFetch<Revenue[]>(`/api/revenues?from=${date}&to=${date}`),
        apiFetch<Expense[]>(`/api/expenses?from=${date}&to=${date}`),
      ]);
      setRevenues(revenuesData);
      setExpenses(expensesData);
    } catch {
      toast.error("Neuspešno učitavanje transakcija.");
    }
  }, []);

  useEffect(() => {
    fetchLedger();
    const id = setInterval(fetchLedger, 30000);
    return () => clearInterval(id);
  }, [fetchLedger]);

  useEffect(() => {
    const handleUpdate = () => fetchLedger();
    window.addEventListener("finance-data-updated", handleUpdate);
    return () => window.removeEventListener("finance-data-updated", handleUpdate);
  }, [fetchLedger]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleRangeChange = (nextRange: DateRange) => {
    setRange(nextRange);
  };

  const handleRowClick = (date: string) => {
    setSelectedDate(date);
    fetchDayDetails(date);
  };

  const currentRow = useMemo(
    () => ledger.find((row) => row.date === selectedDate),
    [ledger, selectedDate]
  );

  const currency = settings?.currency ?? "RSD";
  const defaultFee = Number(settings?.deliveryFeePercent ?? "0");
  const defaultPdvPercent = Number(settings?.defaultPdvPercent ?? "0");

  const handleDelete = async () => {
    if (!showDelete) return;
    try {
      await apiFetch(`/${showDelete.type === "revenue" ? "api/revenues" : "api/expenses"}/${showDelete.id}`,
        { method: "DELETE" }
      );
      toast.success("Stavka je obrisana.");
      setShowDelete(null);
      if (selectedDate) {
        fetchDayDetails(selectedDate);
      }
      fetchLedger();
    } catch {
      toast.error("Neuspešno brisanje stavke.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Analitika i promene po danima</p>
          <h2 className="text-2xl font-semibold">Dnevni pregled</h2>
        </div>
        <DateRangeFilter active={range.label} onChange={handleRangeChange} />
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Prihod lokal (neto)</TableHead>
              <TableHead>Prihod dostava (neto)</TableHead>
              <TableHead>Prihod ukupno</TableHead>
              <TableHead>Troškovi (obaveze)</TableHead>
              <TableHead>Uplate</TableHead>
              <TableHead>PDV</TableHead>
              <TableHead>Stanje na računu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Učitavanje...
                </TableCell>
              </TableRow>
            ) : ledger.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Nema podataka za izabrani period.
                </TableCell>
              </TableRow>
            ) : (
              ledger.map((row) => (
                <TableRow
                  key={row.date}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => handleRowClick(row.date)}
                >
                  <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                  <TableCell>{formatCurrency(row.incomeLocalNet, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.incomeDeliveryNet, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.incomeTotalNet, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.expensesGross, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.paymentsTotal, currency)}</TableCell>
                  <TableCell>{formatCurrency(row.pdvTotal, currency)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(row.runningBalance, currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          </Table>
        </div>
      </div>

      <Sheet open={Boolean(selectedDate)} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedDate ? `Detalji za ${formatDate(selectedDate)}` : "Detalji"}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="rounded-xl border bg-muted/40 p-4 text-sm">
              <p className="font-medium">Rezime dana</p>
              {currentRow ? (
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center justify-between">
                    <span>Prihod ukupno</span>
                    <span>{formatCurrency(currentRow.incomeTotalNet, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Troškovi (obaveze)</span>
                    <span>{formatCurrency(currentRow.expensesGross, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Uplate</span>
                    <span>{formatCurrency(currentRow.paymentsTotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>PDV</span>
                    <span>{formatCurrency(currentRow.pdvTotal, currency)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nema podataka.</p>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Prihodi</h3>
              {revenues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema prihoda za ovaj dan.</p>
              ) : (
                revenues.map((revenue) => (
                  <div key={revenue.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="font-medium">
                        {revenue.channel === "DELIVERY" ? "Dostava" : "Lokal"}
                      </p>
                      <p className="text-xs text-muted-foreground">{revenue.note ?? "Bez beleške"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(revenue.netAmount), currency)}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingRevenue({
                          id: revenue.id,
                          date: revenue.date.slice(0, 10),
                          amount: revenue.amount,
                          channel: revenue.channel,
                          feePercent: revenue.feePercentApplied,
                          note: revenue.note ?? "",
                        })}>
                          Izmeni
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setShowDelete({ type: "revenue", id: revenue.id })}>
                          Obriši
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Troškovi</h3>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nema troškova za ovaj dan.</p>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between rounded-xl border p-3">
                    <div>
                      <p className="font-medium">
                        {expense.supplier?.name
                          ? `${expense.supplier.name} (#${expense.supplier.number})`
                          : expense.supplier
                          ? `Dobavljač #${expense.supplier.number}`
                          : "Ostalo"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.type === "SUPPLIER"
                          ? "Dobavljač"
                          : expense.type === "SALARY"
                          ? "Plate"
                          : "Ostalo"}
                        {expense.note ? ` • ${expense.note}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(expense.grossAmount), currency)}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingExpense({
                          id: expense.id,
                          date: expense.date.slice(0, 10),
                          grossAmount: expense.grossAmount,
                          supplierId: expense.supplier?.id,
                          type: expense.type,
                          pdvPercent: expense.pdvPercent,
                          paidNow: expense.paidNow,
                          receiptId: expense.receiptId ?? undefined,
                          receiptPath: expense.receiptId ? `/api/receipts/${expense.receiptId}` : undefined,
                          note: expense.note ?? "",
                        })}>
                          Izmeni
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setShowDelete({ type: "expense", id: expense.id })}>
                          Obriši
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(editingRevenue)} onOpenChange={(open) => !open && setEditingRevenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Izmeni prihod</DialogTitle>
          </DialogHeader>
          {editingRevenue ? (
            <RevenueForm
              defaultFeePercent={defaultFee}
              initialData={editingRevenue}
              onSuccess={() => {
                setEditingRevenue(null);
                if (selectedDate) {
                  fetchDayDetails(selectedDate);
                }
                fetchLedger();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingExpense)} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Izmeni trošak</DialogTitle>
          </DialogHeader>
          {editingExpense ? (
            <ExpenseForm
              suppliers={suppliers}
              defaultPdvPercent={defaultPdvPercent}
              initialData={editingExpense}
              onSuccess={() => {
                setEditingExpense(null);
                if (selectedDate) {
                  fetchDayDetails(selectedDate);
                }
                fetchLedger();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(showDelete)} onOpenChange={(open) => !open && setShowDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrda brisanja</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite da obrišete ovu stavku? Ova akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Obriši</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
