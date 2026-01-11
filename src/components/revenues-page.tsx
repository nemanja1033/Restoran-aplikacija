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
import { RevenueForm, RevenueFormValues } from "@/components/revenue-form";
import { toast } from "sonner";

type Revenue = {
  id: number;
  date: string;
  amount: string;
  type: "DELIVERY" | "IN_STORE";
  feePercent: string;
  note: string | null;
};

type Settings = {
  currency: string;
  defaultDeliveryFeePercent: string;
};

export function RevenuesPage() {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueFormValues | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [revenuesData, settingsData] = await Promise.all([
        apiFetch<Revenue[]>("/api/revenues"),
        apiFetch<Settings>("/api/settings"),
      ]);
      setRevenues(revenuesData);
      setSettings(settingsData);
    } catch {
      toast.error("Neuspešno učitavanje prihoda.");
    }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const currency = settings?.currency ?? "RSD";
  const defaultFee = Number(settings?.defaultDeliveryFeePercent ?? "0");

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/api/revenues/${deleting}`, { method: "DELETE" });
      toast.success("Prihod je obrisan.");
      setDeleting(null);
      loadData();
    } catch {
      toast.error("Neuspešno brisanje prihoda.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Upravljanje prihodima</p>
          <h2 className="text-2xl font-semibold">Prihodi</h2>
        </div>
        <Button onClick={() => setOpen(true)}>Dodaj prihod</Button>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Iznos</TableHead>
              <TableHead>Provizija</TableHead>
              <TableHead>Beleška</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Još nema unetih prihoda.
                </TableCell>
              </TableRow>
            ) : (
              revenues.map((revenue) => (
                <TableRow key={revenue.id}>
                  <TableCell>{formatDate(revenue.date)}</TableCell>
                  <TableCell>{revenue.type === "DELIVERY" ? "Dostava" : "Lokal"}</TableCell>
                  <TableCell>{formatCurrency(Number(revenue.amount), currency)}</TableCell>
                  <TableCell>
                    {revenue.type === "DELIVERY"
                      ? `${revenue.feePercent}%`
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {revenue.note ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing({
                            id: revenue.id,
                            date: revenue.date.slice(0, 10),
                            amount: revenue.amount,
                            type: revenue.type,
                            feePercent: revenue.feePercent,
                            note: revenue.note ?? "",
                          });
                          setOpen(true);
                        }}
                      >
                        Izmeni
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleting(revenue.id)}
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
            <DialogTitle>{editing ? "Izmeni prihod" : "Dodaj prihod"}</DialogTitle>
          </DialogHeader>
          <RevenueForm
            defaultFeePercent={defaultFee}
            initialData={editing ?? undefined}
            onSuccess={() => {
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
              Da li ste sigurni da želite da obrišete ovaj prihod? Ova akcija je nepovratna.
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
