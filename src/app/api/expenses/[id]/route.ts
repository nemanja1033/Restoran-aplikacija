import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { getSettings } from "@/lib/data";
import { Decimal } from "@prisma/client/runtime/client";
import { calculatePdvBreakdown } from "@/lib/calculations";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const existing = await prisma.expense.findUnique({
      where: { id: Number(id) },
    });
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

    const expense = await prisma.expense.update({
      where: { id: Number(id) },
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

    if (expense.paidNow && expense.supplierId && expense.type === "SUPPLIER" && !existing?.paidNow) {
      await prisma.payment.create({
        data: {
          date: expense.date,
          amount: expense.grossAmount,
          supplierId: expense.supplierId,
          note: "Plaćeno odmah (izmene)",
        },
      });
    }

    return NextResponse.json(expense);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno ažuriranje troška." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    await prisma.expense.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje troška." },
      { status: 400 }
    );
  }
}
