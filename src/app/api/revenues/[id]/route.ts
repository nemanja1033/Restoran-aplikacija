import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { incomeSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { getSettings } from "@/lib/data";
import { calculateDeliveryFee } from "@/lib/calculations";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const parsed = incomeSchema.parse(body);
    const settings = await getSettings();

    const feePercent =
      parsed.channel === "DELIVERY"
        ? decimalFromString(parsed.feePercent ?? settings.deliveryFeePercent.toString())
        : decimalFromString("0");
    const amount = decimalFromString(parsed.amount);
    const { feeAmount, netAmount } =
      parsed.channel === "DELIVERY"
        ? calculateDeliveryFee(amount, feePercent)
        : { feeAmount: decimalFromString("0"), netAmount: amount };

    const revenue = await prisma.income.update({
      where: { id: Number(id) },
      data: {
        date: parseDateString(parsed.date),
        amount,
        channel: parsed.channel,
        feePercentApplied: feePercent,
        feeAmount,
        netAmount,
        note: parsed.note || null,
      },
    });

    return NextResponse.json(revenue);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno ažuriranje prihoda." },
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
    await prisma.income.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje prihoda." },
      { status: 400 }
    );
  }
}
