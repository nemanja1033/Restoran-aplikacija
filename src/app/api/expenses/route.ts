import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { parseISO } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? {
          date: {
            gte: parseISO(from),
            lte: parseISO(to),
          },
        }
      : undefined;

  const expenses = await prisma.expense.findMany({
    where,
    include: { supplier: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const expense = await prisma.expense.create({
      data: {
        date: parseDateString(parsed.date),
        supplierId: parsed.supplierId,
        amount: decimalFromString(parsed.amount),
        paymentMethod: parsed.paymentMethod,
        note: parsed.note || null,
      },
      include: { supplier: true },
    });

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje troška." },
      { status: 400 }
    );
  }
}
