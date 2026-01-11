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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { SupplierForm, SupplierFormValues } from "@/components/supplier-form";
import { toast } from "sonner";

type Expense = {
  id: number;
  date: string;
  amount: string;
  paymentMethod: "ACCOUNT" | "CASH";
  note: string | null;
  supplier: SupplierOption;
};

type Settings = {
  currency: string;
};

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseFormValues | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<SupplierFormValues | null>(null);
  const [deleting, setDeleting] = useState<{ type: "expense" | "supplier"; id: number } | null>(null);

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

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const url = deleting.type === "expense" ? `/api/expenses/${deleting.id}` : `/api/suppliers/${deleting.id}`;
      await apiFetch(url, { method: "DELETE" });
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
        <p className="text-sm text-muted-foreground">Upravljanje troškovima i dobavljačima</p>
        <h2 className="text-2xl font-semibold">Troškovi / Dobavljači</h2>
      </div>

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Troškovi</TabsTrigger>
          <TabsTrigger value="suppliers">Dobavljači</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
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
                  <TableHead>Iznos</TableHead>
                  <TableHead>Način</TableHead>
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
                        {expense.supplier.name
                          ? `${expense.supplier.name} (#${expense.supplier.number})`
                          : `Dobavljač #${expense.supplier.number}`}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(expense.amount), currency)}</TableCell>
                      <TableCell>
                        {expense.paymentMethod === "ACCOUNT" ? "Račun" : "Gotovina"}
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
                                amount: expense.amount,
                                supplierId: expense.supplier.id,
                                paymentMethod: expense.paymentMethod,
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
                            onClick={() => setDeleting({ type: "expense", id: expense.id })}
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
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Katalog dobavljača</div>
            <Button onClick={() => setSupplierDialogOpen(true)}>Dodaj dobavljača</Button>
          </div>
          <div className="rounded-2xl border bg-card">
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Naziv</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                      Još nema unetih dobavljača.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>#{supplier.number}</TableCell>
                      <TableCell>{supplier.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSupplier({
                                id: supplier.id,
                                number: supplier.number,
                                name: supplier.name ?? "",
                              });
                              setSupplierDialogOpen(true);
                            }}
                          >
                            Izmeni
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleting({ type: "supplier", id: supplier.id })}
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
        </TabsContent>
      </Tabs>

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
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Prvo dodajte dobavljača kako biste mogli da unosite troškove.
            </p>
          ) : (
            <ExpenseForm
              suppliers={suppliers}
              initialData={editingExpense ?? undefined}
              onSuccess={() => {
                setExpenseDialogOpen(false);
                setEditingExpense(null);
                loadData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={supplierDialogOpen}
        onOpenChange={(value) => {
          setSupplierDialogOpen(value);
          if (!value) setEditingSupplier(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSupplier ? "Izmeni dobavljača" : "Dodaj dobavljača"}</DialogTitle>
          </DialogHeader>
          <SupplierForm
            initialData={editingSupplier ?? undefined}
            onSuccess={() => {
              setSupplierDialogOpen(false);
              setEditingSupplier(null);
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
