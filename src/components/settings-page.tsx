"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { settingsSchema } from "@/lib/validations";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateRangeFilter } from "@/components/date-range-filter";
import { toast } from "sonner";

export type SettingsFormValues = {
  openingBalance: string;
  defaultDeliveryFeePercent: string;
  currency: string;
};

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({
    label: "30 dana",
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      openingBalance: "0",
      defaultDeliveryFeePercent: "0",
      currency: "RSD",
    },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiFetch<SettingsFormValues>("/api/settings");
        reset({
          openingBalance: data.openingBalance,
          defaultDeliveryFeePercent: data.defaultDeliveryFeePercent,
          currency: data.currency,
        });
      } catch {
        toast.error("Neuspešno učitavanje podešavanja.");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [reset]);

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await apiFetch("/api/settings", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      toast.success("Podešavanja su sačuvana.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`/api/export?from=${range.from}&to=${range.to}`);
      if (!response.ok) {
        throw new Error();
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `finance_export_${range.from}_to_${range.to}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Neuspešan izvoz u Excel.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Podešavanja osnovnih parametara</p>
        <h2 className="text-2xl font-semibold">Podešavanja</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Osnovne vrednosti</h3>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="openingBalance">Početno stanje računa</Label>
                <Input id="openingBalance" type="text" {...register("openingBalance")} />
                {errors.openingBalance ? (
                  <p className="text-xs text-destructive">{errors.openingBalance.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultDeliveryFeePercent">Podrazumevana provizija dostave (%)</Label>
                <Input id="defaultDeliveryFeePercent" type="text" {...register("defaultDeliveryFeePercent")} />
                {errors.defaultDeliveryFeePercent ? (
                  <p className="text-xs text-destructive">{errors.defaultDeliveryFeePercent.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Valuta</Label>
              <Input id="currency" type="text" {...register("currency")} />
            </div>
            <Button type="submit" disabled={loading || isSubmitting}>
              Sačuvaj podešavanja
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h3 className="text-lg font-semibold">Izvoz u Excel</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Izvezite dnevni pregled i sve transakcije za izabrani period.
          </p>
          <div className="mt-4 space-y-3">
            <DateRangeFilter active={range.label} onChange={setRange} />
            <div className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="from">Od</Label>
                <Input
                  id="from"
                  type="date"
                  value={range.from}
                  onChange={(event) =>
                    setRange((prev) => ({ ...prev, from: event.target.value, label: "Custom" }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Do</Label>
                <Input
                  id="to"
                  type="date"
                  value={range.to}
                  onChange={(event) =>
                    setRange((prev) => ({ ...prev, to: event.target.value, label: "Custom" }))
                  }
                />
              </div>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              Izvoz u Excel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
