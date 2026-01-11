"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ExpenseForm, ExpenseFormValues, SupplierOption } from "@/components/expense-form";
import { toast } from "sonner";

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

type Settings = {
  currency: string;
  defaultPdvPercent: string;
};

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseFormValues | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await apiFetch<{
        expenses: Expense[];
        suppliers: SupplierOption[];
        settings: Settings;
      }>("/api/expenses?summary=1");
      setExpenses(data.expenses);
      setSuppliers(data.suppliers);
      setSettings(data.settings);
    } catch {
      toast.error("Neuspešno učitavanje podataka.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const currency = settings?.currency ?? "RSD";
  const defaultPdvPercent = Number(settings?.defaultPdvPercent ?? "0");

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/api/expenses/${deleting}`, { method: "DELETE" });
      toast.success("Stavka je obrisana.");
      setDeleting(null);
      loadData();
    } catch {
      toast.error("Neuspešno brisanje stavke.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Upravljanje troškovima</p>
        <h2 className="text-2xl font-semibold">Troškovi</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Unos i pregled troškova</div>
          <Button onClick={() => setExpenseDialogOpen(true)}>Dodaj trošak</Button>
        </div>
        <div className="rounded-2xl border bg-card">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Dobavljač</TableHead>
                <TableHead>Iznos (bruto)</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Beleška</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Još nema unetih troškova.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.date)}</TableCell>
                    <TableCell>
                      {expense.supplier?.name
                        ? `${expense.supplier.name} (#${expense.supplier.number})`
                        : expense.supplier
                        ? `Dobavljač #${expense.supplier.number}`
                        : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(expense.grossAmount), currency)}</TableCell>
                    <TableCell>
                      {expense.type === "SUPPLIER"
                        ? "Dobavljač"
                        : expense.type === "SALARY"
                        ? "Plate"
                        : "Ostalo"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {expense.note ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingExpense({
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
                            });
                            setExpenseDialogOpen(true);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(expense.id)}
                        >
                          Obriši
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog
        open={expenseDialogOpen}
        onOpenChange={(value) => {
          setExpenseDialogOpen(value);
          if (!value) setEditingExpense(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Izmeni trošak" : "Dodaj trošak"}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            suppliers={suppliers}
            defaultPdvPercent={defaultPdvPercent}
            initialData={editingExpense ?? undefined}
            onSuccess={() => {
              setExpenseDialogOpen(false);
              setEditingExpense(null);
              loadData();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(value) => !value && setDeleting(null)}>
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
