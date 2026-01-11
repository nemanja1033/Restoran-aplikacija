"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { supplierSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SupplierFormValues = {
  id?: number;
  number: number;
  name?: string;
  category: "MEAT" | "VEGETABLES" | "PACKAGING" | "OTHER";
  pdvPercent?: string;
};

export function SupplierForm({
  initialData,
  onSuccess,
}: {
  initialData?: SupplierFormValues;
  onSuccess?: () => void;
}) {
  const defaultValues = useMemo<SupplierFormValues>(
    () => ({
      id: initialData?.id,
      number: initialData?.number ?? 1,
      name: initialData?.name ?? "",
      category: initialData?.category ?? "OTHER",
      pdvPercent: initialData?.pdvPercent ?? "",
    }),
    [initialData]
  );

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

  const category = watch("category");

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      if (values.id) {
        await apiFetch(`/api/suppliers/${values.id}`, {
          method: "PUT",
          body: JSON.stringify(values),
        });
        toast.success("Dobavljač je ažuriran.");
      } else {
        await apiFetch("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Dobavljač je dodat.");
      }
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <input type="hidden" {...register("category")} />
      <div className="space-y-2">
        <Label htmlFor="number">Broj</Label>
        <Input id="number" type="number" min={1} {...register("number", { valueAsNumber: true })} />
        {errors.number ? (
          <p className="text-xs text-destructive">{errors.number.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Naziv</Label>
        <Input id="name" type="text" {...register("name")} />
      </div>
      <div className="space-y-2">
        <Label>Kategorija</Label>
        <Select
          value={category}
          onValueChange={(value) => setValue("category", value as SupplierFormValues["category"])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Izaberite" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MEAT">Meso</SelectItem>
            <SelectItem value="VEGETABLES">Povrće</SelectItem>
            <SelectItem value="PACKAGING">Ambalaža</SelectItem>
            <SelectItem value="OTHER">Ostalo</SelectItem>
          </SelectContent>
        </Select>
        {errors.category ? (
          <p className="text-xs text-destructive">{errors.category.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="pdvPercent">PDV (%)</Label>
        <Input id="pdvPercent" type="text" {...register("pdvPercent")} />
        {errors.pdvPercent ? (
          <p className="text-xs text-destructive">{errors.pdvPercent.message}</p>
        ) : null}
      </div>
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {initialData ? "Sačuvaj izmene" : "Dodaj dobavljača"}
      </Button>
    </form>
  );
}
