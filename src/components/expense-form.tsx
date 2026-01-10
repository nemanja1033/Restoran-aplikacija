"use client";

import { useEffect, useMemo } from "react";
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
  supplierId: number;
  amount: string;
  paymentMethod: "ACCOUNT" | "CASH";
  note?: string;
};

export type SupplierOption = {
  id: number;
  number: number;
  name: string | null;
};

export function ExpenseForm({
  suppliers,
  initialData,
  onSuccess,
}: {
  suppliers: SupplierOption[];
  initialData?: ExpenseFormValues;
  onSuccess?: () => void;
}) {
  const defaultValues = useMemo<ExpenseFormValues>(
    () => ({
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      supplierId: initialData?.supplierId ?? suppliers[0]?.id ?? 0,
      amount: initialData?.amount ?? "",
      paymentMethod: initialData?.paymentMethod ?? "ACCOUNT",
      note: initialData?.note ?? "",
      id: initialData?.id,
    }),
    [initialData, suppliers]
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

  const supplierId = watch("supplierId");
  const paymentMethod = watch("paymentMethod");

  useEffect(() => {
    if (!supplierId && suppliers.length > 0) {
      setValue("supplierId", suppliers[0].id);
    }
  }, [supplierId, suppliers, setValue]);

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      if (values.id) {
        await apiFetch(`/api/expenses/${values.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
        toast.success("Trošak je ažuriran.");
      } else {
        await apiFetch("/api/expenses", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Trošak je dodat.");
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("supplierId", { valueAsNumber: true })} />
      <input type="hidden" {...register("paymentMethod")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date ? (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Iznos</Label>
          <Input id="amount" type="text" placeholder="0.00" {...register("amount")} />
          {errors.amount ? (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Dobavljač</Label>
          <Select
            value={String(supplierId)}
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
        <div className="space-y-2">
          <Label>Način plaćanja</Label>
          <Select
            value={paymentMethod}
            onValueChange={(value) =>
              setValue("paymentMethod", value as ExpenseFormValues["paymentMethod"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACCOUNT">Račun</SelectItem>
              <SelectItem value="CASH">Gotovina</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
