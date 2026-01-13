"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
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
import { SupplierForm, SupplierFormValues } from "@/components/supplier-form";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";

type SupplierSummary = {
  id: number;
  number: number;
  name: string | null;
  category: "MEAT" | "VEGETABLES" | "PACKAGING" | "OTHER";
  pdvPercent: string | null;
  purchasedGross: number;
  paidTotal: number;
  outstanding: number;
};

type SupplierSummaryResponse = {
  suppliers: SupplierSummary[];
  totalOutstanding: number;
};

type Settings = {
  currency: string;
};

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierFormValues | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [summary, settingsData] = await Promise.all([
        apiFetch<SupplierSummaryResponse>("/api/suppliers?summary=1"),
        apiFetch<Settings>("/api/settings"),
      ]);
      setSuppliers(summary.suppliers);
      setTotalOutstanding(summary.totalOutstanding);
      setSettings(settingsData);
    } catch {
      toast.error("Neuspešno učitavanje dobavljača.");
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
      await apiFetch(`/api/suppliers/${deleting}`, { method: "DELETE" });
      toast.success("Dobavljač je obrisan.");
      setDeleting(null);
      loadData();
    } catch {
      toast.error("Neuspešno brisanje dobavljača.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Pregled dobavljača i dugovanja</p>
          <h2 className="text-2xl font-semibold">Dobavljači</h2>
        </div>
        <Button onClick={() => setOpen(true)}>Dodaj dobavljača</Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 text-sm">
        Ukupno dugovanje:{" "}
        <span className="font-semibold">{formatCurrency(totalOutstanding, currency)}</span>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Naziv</TableHead>
                <TableHead>Kategorija</TableHead>
                <TableHead>PDV %</TableHead>
                <TableHead>Kupljeno</TableHead>
                <TableHead>Plaćeno</TableHead>
                <TableHead>Dugovanje</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    Još nema unetih dobavljača.
                  </TableCell>
                </TableRow>
              ) : (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>#{supplier.number}</TableCell>
                    <TableCell>
                      <Link
                        href={`/dobavljaci/${supplier.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {supplier.name ?? `Dobavljač #${supplier.number}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {supplier.category === "MEAT"
                        ? "Meso"
                        : supplier.category === "VEGETABLES"
                        ? "Povrće"
                        : supplier.category === "PACKAGING"
                        ? "Ambalaža"
                        : "Ostalo"}
                    </TableCell>
                    <TableCell>{supplier.pdvPercent ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(supplier.purchasedGross, currency)}</TableCell>
                    <TableCell>{formatCurrency(supplier.paidTotal, currency)}</TableCell>
                    <TableCell>{formatCurrency(supplier.outstanding, currency)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditing({
                              id: supplier.id,
                              number: supplier.number,
                              name: supplier.name ?? "",
                              category: supplier.category,
                              pdvPercent: supplier.pdvPercent ?? "",
                            });
                            setOpen(true);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button size="sm" variant="secondary" asChild>
                          <Link href={`/dobavljaci/${supplier.id}`}>Detalji</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(supplier.id)}
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
            <DialogTitle>{editing ? "Izmeni dobavljača" : "Dodaj dobavljača"}</DialogTitle>
          </DialogHeader>
          <SupplierForm
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
              Da li ste sigurni da želite da obrišete dobavljača? Ova akcija je nepovratna.
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
