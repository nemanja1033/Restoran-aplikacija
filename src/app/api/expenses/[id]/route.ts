import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const expense = await prisma.expense.update({
      where: { id: Number(id) },
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
