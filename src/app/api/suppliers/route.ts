import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { supplierSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { getAccountIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const summary = searchParams.get("summary") === "1";
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }
  const suppliers = await prisma.supplier.findMany({
    where: { accountId },
    orderBy: { number: "asc" },
  });

  if (suppliers.length === 0) {
    await prisma.supplier.createMany({
      data: [
        { accountId, number: 1, name: null, category: "OTHER" },
        { accountId, number: 2, name: null, category: "OTHER" },
      ],
    });
    const seeded = await prisma.supplier.findMany({
      where: { accountId },
      orderBy: { number: "asc" },
    });
    return NextResponse.json(seeded);
  }

  if (!summary) {
    return NextResponse.json(suppliers);
  }

  const expenses = await prisma.expense.findMany({
    select: { supplierId: true, grossAmount: true, type: true, paidNow: true },
    where: { accountId, supplierId: { not: null } },
  });

  const totals = new Map<number, { purchased: number; paid: number }>();
  for (const expense of expenses) {
    if (!expense.supplierId) continue;
    const entry = totals.get(expense.supplierId) ?? { purchased: 0, paid: 0 };
    if (expense.type === "SUPPLIER") {
      entry.purchased += Number(expense.grossAmount.toString());
      if (expense.paidNow) {
        entry.paid += Number(expense.grossAmount.toString());
      }
    } else if (expense.type === "SUPPLIER_PAYMENT") {
      entry.paid += Number(expense.grossAmount.toString());
    }
    totals.set(expense.supplierId, entry);
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
    const accountId = await getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data: {
        accountId,
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
