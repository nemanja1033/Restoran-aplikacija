import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { parseISO } from "date-fns";
import { getSettings } from "@/lib/data";
import { Decimal } from "@prisma/client/runtime/client";
import { calculatePdvBreakdown } from "@/lib/calculations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const summary = searchParams.get("summary") === "1";

  if (summary && !from && !to) {
    const [expenses, suppliers, settings] = await Promise.all([
      prisma.expense.findMany({
        include: { supplier: true, receipt: true },
        orderBy: { date: "desc" },
      }),
      prisma.supplier.findMany({ orderBy: { number: "asc" } }),
      getSettings(),
    ]);

    return NextResponse.json({ expenses, suppliers, settings });
  }

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
    include: { supplier: true, receipt: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const settings = await getSettings();
    const supplier = parsed.supplierId
      ? await prisma.supplier.findUnique({ where: { id: parsed.supplierId } })
      : null;

    const pdvPercent = parsed.pdvPercent
      ? decimalFromString(parsed.pdvPercent)
      : supplier?.pdvPercent ??
        (parsed.type === "SUPPLIER" || parsed.type === "OTHER"
          ? settings.defaultPdvPercent
          : new Decimal(0));

    const grossAmount = decimalFromString(parsed.grossAmount);
    const { netAmount, pdvAmount } = calculatePdvBreakdown(
      grossAmount,
      pdvPercent
    );

    const expense = await prisma.expense.create({
      data: {
        date: parseDateString(parsed.date),
        supplierId: parsed.supplierId ?? null,
        grossAmount,
        netAmount,
        pdvPercent,
        pdvAmount,
        type: parsed.type,
        note: parsed.note || null,
        paidNow: Boolean(parsed.paidNow),
        receiptId: parsed.receiptId ?? null,
      },
      include: { supplier: true },
    });

    if (expense.paidNow && expense.supplierId && expense.type === "SUPPLIER") {
      await prisma.payment.create({
        data: {
          date: expense.date,
          amount: expense.grossAmount,
          supplierId: expense.supplierId,
          note: "Plaćeno odmah",
        },
      });
    }

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje troška." },
      { status: 400 }
    );
  }
}
