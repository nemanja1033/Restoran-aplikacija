import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { paymentSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSupplierOutstanding(supplierId: number) {
  const [expenses, payments] = await Promise.all([
    prisma.expense.aggregate({
      where: { supplierId },
      _sum: { grossAmount: true },
    }),
    prisma.payment.aggregate({
      where: { supplierId },
      _sum: { amount: true },
    }),
  ]);

  const purchased = Number(expenses._sum.grossAmount?.toString() ?? 0);
  const paid = Number(payments._sum.amount?.toString() ?? 0);
  return purchased - paid;
}

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? {
          date: {
            gte: new Date(`${from}T00:00:00`),
            lte: new Date(`${to}T23:59:59`),
          },
        }
      : undefined;

  const payments = await prisma.payment.findMany({
    where,
    include: { supplier: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = paymentSchema.parse(body);

    if (parsed.supplierId) {
      const outstanding = await getSupplierOutstanding(parsed.supplierId);
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

    const payment = await prisma.payment.create({
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
      { error: "Neuspešno dodavanje uplate." },
      { status: 400 }
    );
  }
}
