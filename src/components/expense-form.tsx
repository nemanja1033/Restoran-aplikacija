"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { expenseSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ExpenseFormSchemaValues = z.infer<typeof expenseSchema>;

export type ExpenseFormValues = ExpenseFormSchemaValues & {
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
  const defaultValues = useMemo<ExpenseFormSchemaValues>(
    () => ({
      date: initialData?.date ?? "",
      supplierId: initialData?.supplierId ?? suppliers[0]?.id ?? undefined,
      grossAmount: initialData?.grossAmount ?? "",
      contributionsAmount: initialData?.contributionsAmount ?? "0",
      type: initialData?.type ?? (suppliers.length > 0 ? "SUPPLIER" : "OTHER"),
      pdvPercent: initialData?.pdvPercent ?? defaultPdvPercent.toString(),
      paidNow: initialData?.paidNow ?? true,
      note: initialData?.note ?? "",
      receiptId: initialData?.receiptId,
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
  } = useForm<ExpenseFormSchemaValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const [uploading, setUploading] = useState(false);
  const [receiptPath, setReceiptPath] = useState(initialData?.receiptPath);

  const supplierId = watch("supplierId");
  const expenseType = watch("type");
  const pdvPercent = watch("pdvPercent");
  const paidNow = watch("paidNow");
  const dateValue = watch("date");
  const contributionsAmount = watch("contributionsAmount");

  useEffect(() => {
    register("supplierId");
    register("receiptId");
    register("type");
    register("pdvPercent");
    register("paidNow");
    register("contributionsAmount");
  }, [register]);

  useEffect(() => {
    if (!supplierId && (expenseType === "SUPPLIER" || expenseType === "SUPPLIER_PAYMENT") && suppliers.length > 0) {
      setValue("supplierId", suppliers[0].id);
    }
  }, [supplierId, expenseType, suppliers, setValue]);

  useEffect(() => {
    if (expenseType !== "SUPPLIER" && expenseType !== "SUPPLIER_PAYMENT") {
      setValue("supplierId", undefined);
      if (expenseType === "SALARY") {
        setValue("pdvPercent", "0");
        if (!contributionsAmount) {
          setValue("contributionsAmount", "0");
        }
      } else if (!pdvPercent) {
        setValue("pdvPercent", defaultPdvPercent.toString());
      }
      return;
    }

    const selected = suppliers.find((supplier) => supplier.id === supplierId);
    if (expenseType === "SUPPLIER_PAYMENT") {
      setValue("pdvPercent", "0");
    } else if (selected?.pdvPercent != null) {
      setValue("pdvPercent", String(selected.pdvPercent));
    } else if (!pdvPercent) {
      setValue("pdvPercent", defaultPdvPercent.toString());
    }
  }, [
    contributionsAmount,
    defaultPdvPercent,
    expenseType,
    pdvPercent,
    supplierId,
    suppliers,
    setValue,
  ]);

  useEffect(() => {
    if (expenseType === "SUPPLIER_PAYMENT") {
      setValue("paidNow", true);
    }
  }, [expenseType, setValue]);

  useEffect(() => {
    if (expenseType !== "SALARY") {
      setValue("contributionsAmount", "0");
    }
  }, [expenseType, setValue]);

  useEffect(() => {
    if (!dateValue) {
      setValue("date", new Date().toISOString().slice(0, 10));
    }
  }, [dateValue, setValue]);

  useEffect(() => {
    setReceiptPath(initialData?.receiptPath);
  }, [initialData?.receiptPath]);

  const onSubmit = async (values: ExpenseFormSchemaValues) => {
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
      const authToken =
        typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const response = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error();
      }
      const receipt = await response.json();
      setValue("receiptId", receipt.id);
      setReceiptPath(receipt.downloadUrl ?? `/api/receipts/${receipt.id}`);
      toast.success("Račun je dodat.");
    } catch {
      toast.error("Neuspešan upload računa.");
    } finally {
      setUploading(false);
    }
  };

  const handleReceiptView = async () => {
    if (!receiptPath) return;
    try {
      const authToken =
        typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const response = await fetch(receiptPath, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error();
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error("Neuspešno otvaranje računa.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              <SelectItem value="SUPPLIER_PAYMENT">Uplata dobavljaču (zatvaranje duga)</SelectItem>
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
          <Input
            id="pdvPercent"
            type="text"
            disabled={expenseType === "SUPPLIER_PAYMENT"}
            {...register("pdvPercent")}
          />
          {errors.pdvPercent ? (
            <p className="text-xs text-destructive">{errors.pdvPercent.message}</p>
          ) : null}
        </div>
        {expenseType === "SALARY" ? (
          <div className="space-y-2">
            <Label htmlFor="contributionsAmount">Doprinosi</Label>
            <Input
              id="contributionsAmount"
              type="text"
              placeholder="0.00"
              {...register("contributionsAmount")}
            />
            {errors.contributionsAmount ? (
              <p className="text-xs text-destructive">{errors.contributionsAmount.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      {expenseType === "SUPPLIER" || expenseType === "SUPPLIER_PAYMENT" ? (
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
        <div className="space-y-2 text-sm">
          <Label>Način plaćanja</Label>
          <Select
            value={paidNow ? "paid" : "credit"}
            onValueChange={(value) => setValue("paidNow", value === "paid")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Plaćeno odmah</SelectItem>
              <SelectItem value="credit">Na veresiju</SelectItem>
            </SelectContent>
          </Select>
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
          <button
            type="button"
            onClick={handleReceiptView}
            className="text-xs text-primary underline"
          >
            Pogledaj račun
          </button>
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
