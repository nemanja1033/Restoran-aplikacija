import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { supplierSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const summary = searchParams.get("summary") === "1";
  const suppliers = await prisma.supplier.findMany({
    orderBy: { number: "asc" },
  });

  if (suppliers.length === 0) {
    await prisma.supplier.createMany({
      data: [
        { number: 1, name: null, category: "OTHER" },
        { number: 2, name: null, category: "OTHER" },
      ],
    });
    const seeded = await prisma.supplier.findMany({
      orderBy: { number: "asc" },
    });
    return NextResponse.json(seeded);
  }

  if (!summary) {
    return NextResponse.json(suppliers);
  }

  const expenses = await prisma.expense.findMany({
    select: { supplierId: true, grossAmount: true },
    where: { supplierId: { not: null } },
  });
  const payments = await prisma.payment.findMany({
    select: { supplierId: true, amount: true },
    where: { supplierId: { not: null } },
  });

  const totals = new Map<number, { purchased: number; paid: number }>();
  for (const expense of expenses) {
    if (!expense.supplierId) continue;
    const entry = totals.get(expense.supplierId) ?? { purchased: 0, paid: 0 };
    entry.purchased += Number(expense.grossAmount.toString());
    totals.set(expense.supplierId, entry);
  }
  for (const payment of payments) {
    if (!payment.supplierId) continue;
    const entry = totals.get(payment.supplierId) ?? { purchased: 0, paid: 0 };
    entry.paid += Number(payment.amount.toString());
    totals.set(payment.supplierId, entry);
  }

  const supplierSummaries = suppliers.map((supplier) => {
    const summaryEntry = totals.get(supplier.id) ?? { purchased: 0, paid: 0 };
    return {
      ...supplier,
      purchasedGross: summaryEntry.purchased,
      paidTotal: summaryEntry.paid,
      outstanding: summaryEntry.purchased - summaryEntry.paid,
    };
  });

  const totalOutstanding = supplierSummaries.reduce(
    (acc, supplier) => acc + supplier.outstanding,
    0
  );

  return NextResponse.json({
    suppliers: supplierSummaries,
    totalOutstanding,
  });
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data: {
        number: parsed.number,
        name: parsed.name || null,
        category: parsed.category,
        pdvPercent: parsed.pdvPercent ? decimalFromString(parsed.pdvPercent) : null,
      },
    });

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje dobavljača." },
      { status: 400 }
    );
  }
}
