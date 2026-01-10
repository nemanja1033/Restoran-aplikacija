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

export type SupplierFormValues = {
  id?: number;
  number: number;
  name?: string;
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
    }),
    [initialData]
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues,
  });

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
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {initialData ? "Sačuvaj izmene" : "Dodaj dobavljača"}
      </Button>
    </form>
  );
}
