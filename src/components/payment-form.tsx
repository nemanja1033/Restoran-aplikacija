"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export type PaymentFormValues = {
  id?: number;
  date: string;
  amount: string;
  supplierId?: number;
  note?: string;
};

type SupplierOption = {
  id: number;
  number: number;
  name: string | null;
};

export function PaymentForm({
  suppliers,
  initialData,
  onSuccess,
}: {
  suppliers: SupplierOption[];
  initialData?: PaymentFormValues;
  onSuccess?: (force?: boolean, values?: PaymentFormValues) => void;
}) {
  const defaultValues = useMemo<PaymentFormValues>(
    () => ({
      date: initialData?.date ?? "",
      amount: initialData?.amount ?? "",
      supplierId: initialData?.supplierId ?? undefined,
      note: initialData?.note ?? "",
      id: initialData?.id,
    }),
    [initialData]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  const supplierId = watch("supplierId");
  const dateValue = watch("date");

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      if (values.id) {
        await apiFetch(`/api/payments/${values.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
        toast.success("Uplata je ažurirana.");
      } else {
        await apiFetch("/api/payments", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Uplata je dodata.");
      }
      onSuccess?.();
    } catch (error) {
      if (error instanceof Error && error.message.includes("dugovanja")) {
        onSuccess?.(true, values);
        return;
      }
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("supplierId", { valueAsNumber: true })} />
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
      <div className="space-y-2">
        <Label>Primalac</Label>
        <Select
          value={supplierId ? String(supplierId) : ""}
          onValueChange={(value) =>
            setValue("supplierId", value === "none" ? undefined : Number(value))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Ostalo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ostalo</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={String(supplier.id)}>
                {supplier.name
                  ? `${supplier.name} (#${supplier.number})`
                  : `Dobavljač #${supplier.number}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Beleška</Label>
        <Input id="note" type="text" {...register("note")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {initialData ? "Sačuvaj izmene" : "Dodaj uplatu"}
      </Button>
    </form>
  );
}
  useEffect(() => {
    if (!dateValue) {
      setValue("date", new Date().toISOString().slice(0, 10));
    }
  }, [dateValue, setValue]);
