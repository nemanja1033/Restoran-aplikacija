import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { paymentSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";

export const runtime = "nodejs";

async function getSupplierOutstanding(supplierId: number, excludePaymentId?: number) {
  const [expenses, payments] = await Promise.all([
    prisma.expense.aggregate({
      where: { supplierId },
      _sum: { grossAmount: true },
    }),
    prisma.payment.aggregate({
      where: { supplierId, id: excludePaymentId ? { not: excludePaymentId } : undefined },
      _sum: { amount: true },
    }),
  ]);

  const purchased = Number(expenses._sum.grossAmount?.toString() ?? 0);
  const paid = Number(payments._sum.amount?.toString() ?? 0);
  return purchased - paid;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const parsed = paymentSchema.parse(body);

    if (parsed.supplierId) {
      const outstanding = await getSupplierOutstanding(parsed.supplierId, Number(id));
      const amount = Number(parsed.amount);
      if (amount > outstanding && !parsed.allowOverpay) {
        return NextResponse.json(
          {
            error:
              "Iznos uplate je veći od trenutnog dugovanja. Potvrdite ako želite da zabeležite preplatu.",
          },
          { status: 400 }
        );
      }
    }

    const payment = await prisma.payment.update({
      where: { id: Number(id) },
      data: {
        date: parseDateString(parsed.date),
        amount: decimalFromString(parsed.amount),
        supplierId: parsed.supplierId ?? null,
        note: parsed.note || null,
      },
      include: { supplier: true },
    });

    return NextResponse.json(payment);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno ažuriranje uplate." },
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
    await prisma.payment.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje uplate." },
      { status: 400 }
    );
  }
}
