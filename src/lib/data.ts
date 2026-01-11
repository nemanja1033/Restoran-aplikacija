import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { Decimal } from "@prisma/client/runtime/client";
import { parseISO } from "date-fns";

export async function getSettings(accountId: number) {
  await ensureSchema();
  const settings = await prisma.settings.findUnique({
    where: { accountId },
  });
  if (!settings) {
    return prisma.settings.create({
      data: {
        accountId,
        startingBalance: new Decimal("0"),
        defaultPdvPercent: new Decimal("0"),
        deliveryFeePercent: new Decimal("0"),
        currency: "RSD",
      },
    });
  }
  return settings;
}

export async function getSuppliers(accountId: number) {
  await ensureSchema();
  return prisma.supplier.findMany({
    where: { accountId },
    orderBy: { number: "asc" },
  });
}

export async function getIncomes(accountId: number, from: string, to: string) {
  await ensureSchema();
  return prisma.income.findMany({
    where: {
      accountId,
      date: {
        gte: parseISO(from),
        lte: parseISO(to),
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getExpenses(accountId: number, from: string, to: string) {
  await ensureSchema();
  return prisma.expense.findMany({
    where: {
      accountId,
      date: {
        gte: parseISO(from),
        lte: parseISO(to),
      },
    },
    include: { supplier: true, receipt: true },
    orderBy: { date: "asc" },
  });
}

export async function getExpensesAll(accountId: number) {
  await ensureSchema();
  return prisma.expense.findMany({
    where: { accountId },
    include: { supplier: true, receipt: true },
    orderBy: { date: "desc" },
  });
}

export async function getIncomesAll(accountId: number) {
  await ensureSchema();
  return prisma.income.findMany({
    where: { accountId },
    orderBy: { date: "desc" },
  });
}
