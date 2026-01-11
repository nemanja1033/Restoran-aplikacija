"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { expenseSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ExpenseFormValues = {
  id?: number;
  date: string;
  grossAmount: string;
  type: "SUPPLIER" | "SALARY" | "OTHER";
  supplierId?: number;
  pdvPercent?: string;
  paidNow?: boolean;
  note?: string;
  receiptId?: number;
  receiptPath?: string;
};

export type SupplierOption = {
  id: number;
  number: number;
  name: string | null;
  category?: string;
  pdvPercent?: string | null;
};

export function ExpenseForm({
  suppliers,
  defaultPdvPercent,
  initialData,
  onSuccess,
}: {
  suppliers: SupplierOption[];
  defaultPdvPercent: number;
  initialData?: ExpenseFormValues;
  onSuccess?: () => void;
}) {
  const defaultValues = useMemo<ExpenseFormValues>(
    () => ({
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      supplierId: initialData?.supplierId ?? suppliers[0]?.id ?? undefined,
      grossAmount: initialData?.grossAmount ?? "",
      type: initialData?.type ?? (suppliers.length > 0 ? "SUPPLIER" : "OTHER"),
      pdvPercent: initialData?.pdvPercent ?? defaultPdvPercent.toString(),
      paidNow: initialData?.paidNow ?? false,
      note: initialData?.note ?? "",
      receiptId: initialData?.receiptId,
      receiptPath: initialData?.receiptPath,
      id: initialData?.id,
    }),
    [defaultPdvPercent, initialData, suppliers]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const [uploading, setUploading] = useState(false);
  const [receiptPath, setReceiptPath] = useState(defaultValues.receiptPath);

  const supplierId = watch("supplierId");
  const expenseType = watch("type");
  const pdvPercent = watch("pdvPercent");

  useEffect(() => {
    if (!supplierId && expenseType === "SUPPLIER" && suppliers.length > 0) {
      setValue("supplierId", suppliers[0].id);
    }
  }, [supplierId, expenseType, suppliers, setValue]);

  useEffect(() => {
    if (expenseType !== "SUPPLIER") {
      setValue("supplierId", undefined);
      if (expenseType === "SALARY") {
        setValue("pdvPercent", "0");
      } else if (!pdvPercent) {
        setValue("pdvPercent", defaultPdvPercent.toString());
      }
      return;
    }

    const selected = suppliers.find((supplier) => supplier.id === supplierId);
    if (selected?.pdvPercent != null) {
      setValue("pdvPercent", String(selected.pdvPercent));
    } else if (!pdvPercent) {
      setValue("pdvPercent", defaultPdvPercent.toString());
    }
  }, [defaultPdvPercent, expenseType, pdvPercent, supplierId, suppliers, setValue]);

  useEffect(() => {
    setReceiptPath(defaultValues.receiptPath);
  }, [defaultValues.receiptPath]);

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      const supplierId =
        typeof values.supplierId === "number" && Number.isFinite(values.supplierId)
          ? values.supplierId
          : undefined;
      if (values.id) {
        await apiFetch(`/api/expenses/${values.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...values, supplierId }),
        });
        toast.success("Trošak je ažuriran.");
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify({ ...values, supplierId }),
        });
        toast.success("Trošak je dodat.");
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  const handleReceiptUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error();
      }
      const receipt = await response.json();
      setValue("receiptId", receipt.id);
      setReceiptPath(receipt.storagePath);
      toast.success("Račun je dodat.");
    } catch {
      toast.error("Neuspešan upload računa.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("supplierId", { valueAsNumber: true })} />
      <input type="hidden" {...register("type")} />
      <input type="hidden" {...register("pdvPercent")} />
      <input type="hidden" {...register("receiptId", { valueAsNumber: true })} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date ? (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="grossAmount">Iznos (bruto)</Label>
          <Input id="grossAmount" type="text" placeholder="0.00" {...register("grossAmount")} />
          {errors.grossAmount ? (
            <p className="text-xs text-destructive">{errors.grossAmount.message}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tip troška</Label>
          <Select
            value={expenseType}
            onValueChange={(value) => setValue("type", value as ExpenseFormValues["type"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SUPPLIER">Dobavljač</SelectItem>
              <SelectItem value="SALARY">Plate</SelectItem>
              <SelectItem value="OTHER">Ostalo</SelectItem>
            </SelectContent>
          </Select>
          {errors.type ? (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="pdvPercent">PDV (%)</Label>
          <Input id="pdvPercent" type="text" {...register("pdvPercent")} />
          {errors.pdvPercent ? (
            <p className="text-xs text-destructive">{errors.pdvPercent.message}</p>
          ) : null}
        </div>
      </div>
      {expenseType === "SUPPLIER" ? (
        <div className="space-y-2">
          <Label>Dobavljač</Label>
          <Select
            value={supplierId ? String(supplierId) : ""}
            onValueChange={(value) => setValue("supplierId", Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name
                    ? `${supplier.name} (#${supplier.number})`
                    : `Dobavljač #${supplier.number}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplierId ? (
            <p className="text-xs text-destructive">{errors.supplierId.message}</p>
          ) : null}
        </div>
      ) : null}
      {expenseType === "SUPPLIER" ? (
        <div className="flex items-center gap-2 text-sm">
          <input
            id="paidNow"
            type="checkbox"
            className="h-4 w-4"
            {...register("paidNow")}
          />
          <Label htmlFor="paidNow">Plaćeno odmah?</Label>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="receipt">Račun (slika ili PDF)</Label>
        <Input
          id="receipt"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              handleReceiptUpload(file);
            }
          }}
        />
        {receiptPath ? (
          <a
            href={receiptPath}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline"
          >
            Pogledaj račun
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Nije dodat račun.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Beleška</Label>
        <Textarea id="note" rows={3} {...register("note")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {initialData ? "Sačuvaj izmene" : "Dodaj trošak"}
      </Button>
    </form>
  );
}
