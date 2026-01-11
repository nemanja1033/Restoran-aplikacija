"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { incomeSchema } from "@/lib/validations";
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
  channel: "DELIVERY" | "LOCAL";
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
      date: initialData?.date ?? "",
      amount: initialData?.amount ?? "",
      channel: initialData?.channel ?? "LOCAL",
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
    resolver: zodResolver(incomeSchema),
    defaultValues,
  });

  const type = watch("channel");
  const dateValue = watch("date");

  useEffect(() => {
    if (type === "DELIVERY" && !watch("feePercent")) {
      setValue("feePercent", defaultFeePercent.toString());
    }
    if (type === "LOCAL") {
      setValue("feePercent", "0");
    }
  }, [type, defaultFeePercent, setValue, watch]);

  useEffect(() => {
    if (!dateValue) {
      setValue("date", new Date().toISOString().slice(0, 10));
    }
  }, [dateValue, setValue]);

  const onSubmit = async (values: RevenueFormValues) => {
    try {
      const payload = {
        ...values,
        feePercent: values.channel === "DELIVERY" ? values.feePercent : "0",
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
      <input type="hidden" {...register("channel")} />
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
            onValueChange={(value) => setValue("channel", value as RevenueFormValues["channel"])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOCAL">U lokalu</SelectItem>
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
