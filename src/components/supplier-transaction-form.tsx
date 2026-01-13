"use client";

import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierTransactionSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export type SupplierTransactionFormValues = {
  supplierId: number;
  type: "RACUN" | "UPLATA" | "KOREKCIJA";
  amount: string;
  vatRate?: string;
  description: string;
  invoiceNumber?: string;
  date: string;
};

export function SupplierTransactionForm({
  supplierId,
  defaultVatRate,
  initialType = "RACUN",
  onSuccess,
}: {
  supplierId: number;
  defaultVatRate: number;
  initialType?: SupplierTransactionFormValues["type"];
  onSuccess?: () => void;
}) {
  const defaultValues = useMemo<SupplierTransactionFormValues>(
    () => ({
      supplierId,
      type: initialType,
      amount: "",
      vatRate: defaultVatRate.toString(),
      description: "",
      invoiceNumber: "",
      date: new Date().toISOString().slice(0, 10),
    }),
    [defaultVatRate, initialType, supplierId]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SupplierTransactionFormValues>({
    resolver: zodResolver(supplierTransactionSchema),
    defaultValues,
  });

  const type = watch("type");
  const vatRate = watch("vatRate");
  const previousType = useRef(type);

  useEffect(() => {
    if (type === "UPLATA") {
      setValue("vatRate", "0");
      previousType.current = type;
      return;
    }
    if (previousType.current === "UPLATA") {
      setValue("vatRate", defaultVatRate.toString());
      previousType.current = type;
      return;
    }
    if (!vatRate) {
      setValue("vatRate", defaultVatRate.toString());
    }
    previousType.current = type;
  }, [defaultVatRate, setValue, type, vatRate]);

  const onSubmit = async (values: SupplierTransactionFormValues) => {
    try {
      await apiFetch(`/api/suppliers/${supplierId}/ledger`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      toast.success("Stavka je dodata.");
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("supplierId", { valueAsNumber: true })} />
      <input type="hidden" {...register("type")} />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Datum</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date ? (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Iznos (bruto)</Label>
          <Input id="amount" type="text" placeholder="0.00" {...register("amount")} />
          {errors.amount ? (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tip stavke</Label>
          <Select
            value={type}
            onValueChange={(value) =>
              setValue("type", value as SupplierTransactionFormValues["type"])
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RACUN">Račun</SelectItem>
              <SelectItem value="UPLATA">Uplata</SelectItem>
              <SelectItem value="KOREKCIJA">Korekcija</SelectItem>
            </SelectContent>
          </Select>
          {errors.type ? (
            <p className="text-xs text-destructive">{errors.type.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="vatRate">PDV (%)</Label>
          <Input
            id="vatRate"
            type="text"
            disabled={type === "UPLATA"}
            {...register("vatRate")}
          />
          {errors.vatRate ? (
            <p className="text-xs text-destructive">{errors.vatRate.message}</p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Broj računa</Label>
          <Input id="invoiceNumber" type="text" {...register("invoiceNumber")} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Textarea id="description" rows={3} {...register("description")} />
        {errors.description ? (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        Sačuvaj
      </Button>
    </form>
  );
}
