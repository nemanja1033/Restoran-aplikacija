"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { PaymentForm, PaymentFormValues } from "@/components/payment-form";
import { SupplierOption } from "@/components/expense-form";
import { toast } from "sonner";

type Payment = {
  id: number;
  date: string;
  amount: string;
  note: string | null;
  supplier: SupplierOption | null;
};

type Settings = {
  currency: string;
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentFormValues | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmOverpay, setConfirmOverpay] = useState<PaymentFormValues | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [paymentsData, suppliersData, settingsData] = await Promise.all([
        apiFetch<Payment[]>("/api/payments"),
        apiFetch<SupplierOption[]>("/api/suppliers"),
        apiFetch<Settings>("/api/settings"),
      ]);
      setPayments(paymentsData);
      setSuppliers(suppliersData);
      setSettings(settingsData);
    } catch {
      toast.error("Neuspešno učitavanje uplata.");
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
      await apiFetch(`/api/payments/${deleting}`, { method: "DELETE" });
      toast.success("Uplata je obrisana.");
      setDeleting(null);
      loadData();
    } catch {
      toast.error("Neuspešno brisanje uplate.");
    }
  };

  const handleConfirmOverpay = async () => {
    if (!confirmOverpay) return;
    try {
      const payload = { ...confirmOverpay, allowOverpay: true };
      if (confirmOverpay.id) {
        await apiFetch(`/api/payments/${confirmOverpay.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/payments", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      toast.success("Uplata je sačuvana uz preplatu.");
      setConfirmOverpay(null);
      setOpen(false);
      setEditing(null);
      loadData();
    } catch {
      toast.error("Neuspešno potvrđivanje uplate.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Upravljanje uplatama dobavljačima</p>
          <h2 className="text-2xl font-semibold">Uplate</h2>
        </div>
        <Button onClick={() => setOpen(true)}>Dodaj uplatu</Button>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Primalac</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Beleška</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    Još nema unetih uplata.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.date)}</TableCell>
                    <TableCell>
                      {payment.supplier
                        ? payment.supplier.name
                          ? `${payment.supplier.name} (#${payment.supplier.number})`
                          : `Dobavljač #${payment.supplier.number}`
                        : "Ostalo"}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(payment.amount), currency)}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {payment.note ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing({
                              id: payment.id,
                              date: payment.date.slice(0, 10),
                              amount: payment.amount,
                              supplierId: payment.supplier?.id,
                              note: payment.note ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(payment.id)}
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

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Izmeni uplatu" : "Dodaj uplatu"}</DialogTitle>
          </DialogHeader>
          <PaymentForm
            suppliers={suppliers}
            initialData={editing ?? undefined}
            onSuccess={(force, values) => {
              if (force && values) {
                setConfirmOverpay(values);
                return;
              }
              setOpen(false);
              setEditing(null);
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
              Da li ste sigurni da želite da obrišete ovu uplatu? Ova akcija je nepovratna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Obriši</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(confirmOverpay)} onOpenChange={(value) => !value && setConfirmOverpay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrda preplate</AlertDialogTitle>
            <AlertDialogDescription>
              Iznos uplate je veći od trenutnog dugovanja. Da li želite da zabeležite preplatu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmOverpay}>Potvrdi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
