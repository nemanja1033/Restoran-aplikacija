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
    .number()
    .int()
    .min(1, "Broj dobavljača mora biti veći od 0"),
  name: z.string().trim().optional(),
  category: z.enum(["MEAT", "VEGETABLES", "PACKAGING", "OTHER"]),
  pdvPercent: decimalString.optional(),
});

export const expenseSchema = z
  .object({
    id: z.number().int().optional(),
    date: dateStringSchema,
    grossAmount: decimalString,
    type: z.enum(["SUPPLIER", "SUPPLIER_PAYMENT", "SALARY", "OTHER"]),
    supplierId: z.number().int().optional(),
    pdvPercent: decimalString.optional(),
    note: z.string().trim().optional(),
    paidNow: z.boolean().optional(),
    receiptId: z.number().int().optional(),
  })
  .superRefine((data, ctx) => {
    if ((data.type === "SUPPLIER" || data.type === "SUPPLIER_PAYMENT") && !data.supplierId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dobavljač je obavezan za ovaj tip troška",
        path: ["supplierId"],
      });
    }
  });

export const incomeSchema = z
  .object({
    id: z.number().int().optional(),
    date: dateStringSchema,
    amount: decimalString,
    channel: z.enum(["DELIVERY", "LOCAL"]),
    feePercent: decimalString.optional(),
    note: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "DELIVERY") {
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
  startingBalance: decimalString,
  defaultPdvPercent: decimalString,
  deliveryFeePercent: decimalString,
  currency: z.string().trim(),
});

export const dateRangeSchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
});

export type SupplierInput = z.infer<typeof supplierSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
