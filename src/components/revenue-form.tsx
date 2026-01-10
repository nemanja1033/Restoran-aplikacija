"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { revenueSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type RevenueFormValues = {
  id?: number;
  date: string;
  amount: string;
  type: "DELIVERY" | "IN_STORE";
  feePercent?: string;
  note?: string;
};

export function RevenueForm({
  defaultFeePercent,
  initialData,
  onSuccess,
}: {
  defaultFeePercent: number;
  initialData?: RevenueFormValues;
  onSuccess?: () => void;
}) {
  const defaultValues = useMemo<RevenueFormValues>(
    () => ({
      date: initialData?.date ?? new Date().toISOString().slice(0, 10),
      amount: initialData?.amount ?? "",
      type: initialData?.type ?? "IN_STORE",
      feePercent: initialData?.feePercent ?? defaultFeePercent.toString(),
      note: initialData?.note ?? "",
      id: initialData?.id,
    }),
    [defaultFeePercent, initialData]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueSchema),
    defaultValues,
  });

  const type = watch("type");

  useEffect(() => {
    if (type === "DELIVERY" && !watch("feePercent")) {
      setValue("feePercent", defaultFeePercent.toString());
    }
    if (type === "IN_STORE") {
      setValue("feePercent", "0");
    }
  }, [type, defaultFeePercent, setValue, watch]);

  const onSubmit = async (values: RevenueFormValues) => {
    try {
      const payload = {
        ...values,
        feePercent: values.type === "DELIVERY" ? values.feePercent : "0",
      };

      if (values.id) {
        await apiFetch(`/api/revenues/${values.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Prihod je ažuriran.");
      } else {
        await apiFetch("/api/revenues", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success("Prihod je dodat.");
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("type")} />
      <input type="hidden" {...register("feePercent")} />
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
          <Label>Tip prihoda</Label>
          <Select
            value={type}
            onValueChange={(value) => setValue("type", value as RevenueFormValues["type"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_STORE">U lokalu</SelectItem>
              <SelectItem value="DELIVERY">Dostava</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type === "DELIVERY" ? (
          <div className="space-y-2">
            <Label htmlFor="feePercent">Provizija (%)</Label>
            <Input id="feePercent" type="text" {...register("feePercent")} />
            {errors.feePercent ? (
              <p className="text-xs text-destructive">{errors.feePercent.message}</p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="note">Beleška</Label>
        <Textarea id="note" rows={3} {...register("note")} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {initialData ? "Sačuvaj izmene" : "Dodaj prihod"}
      </Button>
    </form>
  );
}
