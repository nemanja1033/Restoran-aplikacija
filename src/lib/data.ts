import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/client";
import { parseISO } from "date-fns";

export async function getSettings() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) {
    return prisma.settings.create({
      data: {
        id: 1,
        openingBalance: new Decimal("0"),
        defaultDeliveryFeePercent: new Decimal("0"),
        currency: "RSD",
      },
    });
  }
  return settings;
}

export async function getSuppliers() {
  return prisma.supplier.findMany({ orderBy: { number: "asc" } });
}

export async function getRevenues(from: string, to: string) {
  return prisma.revenue.findMany({
    where: {
      date: {
        gte: parseISO(from),
        lte: parseISO(to),
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getExpenses(from: string, to: string) {
  return prisma.expense.findMany({
    where: {
      date: {
        gte: parseISO(from),
        lte: parseISO(to),
      },
    },
    include: { supplier: true },
    orderBy: { date: "asc" },
  });
}

export async function getExpensesAll() {
  return prisma.expense.findMany({
    include: { supplier: true },
    orderBy: { date: "desc" },
  });
}

export async function getRevenuesAll() {
  return prisma.revenue.findMany({
    orderBy: { date: "desc" },
  });
}
