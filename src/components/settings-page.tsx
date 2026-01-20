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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export type SettingsFormValues = {
  startingBalance: string;
  defaultPdvPercent: string;
  deliveryFeePercent: string;
  currency: string;
};

export function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [range, setRange] = useState({
    label: "30 dana",
    from: "",
    to: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      startingBalance: "0",
      defaultPdvPercent: "0",
      deliveryFeePercent: "0",
      currency: "RSD",
    },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiFetch<SettingsFormValues>("/api/settings");
        reset({
          startingBalance: data.startingBalance,
          defaultPdvPercent: data.defaultPdvPercent,
          deliveryFeePercent: data.deliveryFeePercent,
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

  useEffect(() => {
    if (!range.from || !range.to) {
      const today = new Date();
      setRange({
        label: "30 dana",
        from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        to: today.toISOString().slice(0, 10),
      });
    }
  }, [range.from, range.to]);

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
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch(`/api/export?from=${range.from}&to=${range.to}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
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

  const handleReset = async () => {
    try {
      await apiFetch("/api/reset", { method: "POST" });
      toast.success("Podaci su resetovani.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Došlo je do greške.");
    } finally {
      setResetOpen(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      <div>
        <p className="text-sm text-muted-foreground max-w-[65ch]">
          Podešavanja osnovnih parametara
        </p>
        <h2 className="max-w-[24ch] text-[clamp(1.6rem,4.5vw,2.25rem)] font-semibold leading-tight">
          Podešavanja
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border bg-card p-4 sm:p-6">
          <h3 className="text-lg font-semibold">Osnovne vrednosti</h3>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startingBalance">Početno stanje računa</Label>
                <Input id="startingBalance" type="text" {...register("startingBalance")} />
                {errors.startingBalance ? (
                  <p className="text-xs text-destructive">{errors.startingBalance.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryFeePercent">Podrazumevana provizija dostave (%)</Label>
                <Input id="deliveryFeePercent" type="text" {...register("deliveryFeePercent")} />
                {errors.deliveryFeePercent ? (
                  <p className="text-xs text-destructive">{errors.deliveryFeePercent.message}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultPdvPercent">Podrazumevani PDV (%)</Label>
              <Input id="defaultPdvPercent" type="text" {...register("defaultPdvPercent")} />
              {errors.defaultPdvPercent ? (
                <p className="text-xs text-destructive">{errors.defaultPdvPercent.message}</p>
              ) : null}
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

        <div className="rounded-2xl border bg-card p-4 sm:p-6">
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

      <div className="rounded-2xl border border-destructive/30 bg-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold">Reset podataka</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Brisanjem se uklanjaju svi uneti prihodi i troškovi. Dobavljači i podešavanja ostaju.
        </p>
        <Button variant="destructive" className="mt-4" onClick={() => setResetOpen(true)}>
          Resetuj podatke
        </Button>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potvrda resetovanja</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni? Ova akcija briše sve prihode i troškove i ne može se poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Resetuj</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
