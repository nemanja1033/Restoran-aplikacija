import { z } from "zod";

const decimalString = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/, "Unesite ispravan iznos")
  .transform((value) => value.replace(",", "."));

export const dateStringSchema = z
  .string()
  .min(1, "Datum je obavezan")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD");

export const supplierSchema = z.object({
  id: z.number().int().optional(),
  number: z
    .number({ invalid_type_error: "Broj dobavljača je obavezan" })
    .int()
    .min(1, "Broj dobavljača mora biti veći od 0"),
  name: z.string().trim().optional(),
});

export const expenseSchema = z.object({
  id: z.number().int().optional(),
  date: dateStringSchema,
  supplierId: z
    .number({ invalid_type_error: "Dobavljač je obavezan" })
    .int()
    .min(1),
  amount: decimalString,
  paymentMethod: z.enum(["ACCOUNT", "CASH"]),
  note: z.string().trim().optional(),
});

export const revenueSchema = z
  .object({
    id: z.number().int().optional(),
    date: dateStringSchema,
    amount: decimalString,
    type: z.enum(["DELIVERY", "IN_STORE"]),
    feePercent: decimalString.optional(),
    note: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "DELIVERY") {
      if (!data.feePercent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Unesite procenat provizije",
          path: ["feePercent"],
        });
      }
    }
  });

export const settingsSchema = z.object({
  openingBalance: decimalString,
  defaultDeliveryFeePercent: decimalString,
  currency: z.string().trim().default("RSD"),
});

export const dateRangeSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type RevenueInput = z.infer<typeof revenueSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
