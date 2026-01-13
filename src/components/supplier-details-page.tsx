"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SupplierTransactionForm } from "@/components/supplier-transaction-form";
import { toast } from "sonner";

type Supplier = {
  id: number;
  number: number;
  name: string | null;
  category: "MEAT" | "VEGETABLES" | "PACKAGING" | "OTHER";
  pdvPercent: string | null;
  createdAt: string;
};

type LedgerTransaction = {
  id: number;
  date: string;
  type: "RACUN" | "UPLATA" | "KOREKCIJA";
  description: string;
  invoiceNumber: string | null;
  grossAmount: number;
  netAmount: number;
  pdvAmount: number;
  vatRate: number;
  runningBalance: number;
};

type LedgerSummary = {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  totalNet: number;
  totalPdv: number;
  totalGross: number;
};

type Settings = {
  currency: string;
  defaultPdvPercent: string;
};

type LedgerResponse = {
  supplier: Supplier;
  settings: Settings;
  resolvedPdvPercent: number;
  summary: LedgerSummary;
  transactions: LedgerTransaction[];
};

const typeLabels: Record<LedgerTransaction["type"], string> = {
  RACUN: "Račun",
  UPLATA: "Uplata",
  KOREKCIJA: "Korekcija",
};

const categoryLabels: Record<Supplier["category"], string> = {
  MEAT: "Meso",
  VEGETABLES: "Povrće",
  PACKAGING: "Ambalaža",
  OTHER: "Ostalo",
};

export function SupplierDetailsPage({ supplierId }: { supplierId: number }) {
  const [data, setData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialType, setInitialType] = useState<LedgerTransaction["type"]>("RACUN");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [typeFilter, setTypeFilter] = useState<"ALL" | LedgerTransaction["type"]>("ALL");

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const response = await apiFetch<LedgerResponse>(
        `/api/suppliers/${supplierId}/ledger?${params.toString()}`
      );
      setData(response);
    } catch {
      toast.error("Neuspešno učitavanje dobavljača.");
    } finally {
      setLoading(false);
    }
  }, [query, range.from, range.to, supplierId, typeFilter]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [loadData]);

  const supplierName = useMemo(() => {
    if (!data?.supplier) return "";
    return data.supplier.name
      ? `${data.supplier.name} (#${data.supplier.number})`
      : `Dobavljač #${data.supplier.number}`;
  }, [data?.supplier]);

  const currency = data?.settings.currency ?? "RSD";
  const resolvedPdvPercent = data?.resolvedPdvPercent ?? 10;
  const summary = data?.summary;
  const transactions = data?.transactions ?? [];
  const isEmpty = !loading && transactions.length === 0;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      const response = await fetch(
        `/api/suppliers/${supplierId}/ledger/export?${params.toString()}`
      );
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dobavljac_${supplierId}_ledger.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Neuspešan izvoz.");
    }
  };

  const pdvLabel = data?.supplier?.pdvPercent
    ? "PDV dobavljača"
    : "Podrazumevani PDV";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Detalji dobavljača i pregled transakcija</p>
          <h2 className="text-2xl font-semibold">{supplierName || "Dobavljač"}</h2>
          {data?.supplier ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">#{data.supplier.number}</Badge>
              <Badge variant="outline">{categoryLabels[data.supplier.category]}</Badge>
              <Badge variant="outline">
                {pdvLabel}: {resolvedPdvPercent}%
              </Badge>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setInitialType("RACUN");
              setDialogOpen(true);
            }}
          >
            Dodaj račun
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setInitialType("UPLATA");
              setDialogOpen(true);
            }}
          >
            Dodaj uplatu
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setInitialType("KOREKCIJA");
              setDialogOpen(true);
            }}
          >
            Korekcija
          </Button>
          <Button onClick={handleExport}>Izvoz</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Trenutno dugovanje</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(summary?.outstanding ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ukupno fakturisano</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary?.totalInvoiced ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ukupno uplaćeno</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary?.totalPaid ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Neto</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary?.totalNet ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PDV iznos</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary?.totalPdv ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bruto</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(summary?.totalGross ?? 0, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="search">Pretraga</Label>
                <Input
                  id="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Opis ili broj računa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from">Od</Label>
                <Input
                  id="from"
                  type="date"
                  value={range.from}
                  onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Do</Label>
                <Input
                  id="to"
                  type="date"
                  value={range.to}
                  onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sve" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Sve</SelectItem>
                    <SelectItem value="RACUN">Račun</SelectItem>
                    <SelectItem value="UPLATA">Uplata</SelectItem>
                    <SelectItem value="KOREKCIJA">Korekcija</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-card">
            <div className="hidden lg:block">
              <div className="overflow-x-auto">
                <Table className="min-w-[980px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead>Broj računa</TableHead>
                      <TableHead>Neto</TableHead>
                      <TableHead>PDV</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>Stanje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          Učitavanje...
                        </TableCell>
                      </TableRow>
                    ) : isEmpty ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                          Nema stavki za izabrane filtere.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transactions.map((transaction) => (
                        <TableRow key={transaction.id} className="animate-in fade-in-0">
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{typeLabels[transaction.type]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[240px] truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>{transaction.invoiceNumber ?? "-"}</TableCell>
                          <TableCell>
                            {formatCurrency(transaction.netAmount, currency)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatCurrency(transaction.pdvAmount, currency)}</span>
                              <span className="text-xs text-muted-foreground">
                                {transaction.vatRate}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.grossAmount, currency)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(transaction.runningBalance, currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="lg:hidden">
              <div className="space-y-4 p-4">
                {loading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Učitavanje...</div>
                ) : isEmpty ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Nema stavki za izabrane filtere.
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-xl border bg-background p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.date)}
                          </p>
                          <p className="text-sm font-medium">{transaction.description}</p>
                        </div>
                        <Badge variant="outline">{typeLabels[transaction.type]}</Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Broj računa</span>
                          <span>{transaction.invoiceNumber ?? "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Neto</span>
                          <span>{formatCurrency(transaction.netAmount, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">PDV</span>
                          <span>
                            {formatCurrency(transaction.pdvAmount, currency)} ({transaction.vatRate}%)
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bruto</span>
                          <span>{formatCurrency(transaction.grossAmount, currency)}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-muted-foreground">Stanje</span>
                          <span>{formatCurrency(transaction.runningBalance, currency)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border bg-card p-4 lg:sticky lg:top-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Trenutno dugovanje</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(summary?.outstanding ?? 0, currency)}
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ukupno fakturisano</span>
                <span className="font-medium">
                  {formatCurrency(summary?.totalInvoiced ?? 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ukupno uplaćeno</span>
                <span className="font-medium">
                  {formatCurrency(summary?.totalPaid ?? 0, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">PDV</span>
                <span className="font-medium">
                  {resolvedPdvPercent}% ({pdvLabel})
                </span>
              </div>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
              PDV se primenjuje po prioritetu: transakcija → dobavljač → globalno.
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {initialType === "RACUN"
                ? "Dodaj račun"
                : initialType === "UPLATA"
                ? "Dodaj uplatu"
                : "Korekcija"}
            </DialogTitle>
          </DialogHeader>
          <SupplierTransactionForm
            key={`${supplierId}-${initialType}`}
            supplierId={supplierId}
            defaultVatRate={resolvedPdvPercent}
            initialType={initialType}
            onSuccess={() => {
              setDialogOpen(false);
              loadData();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
