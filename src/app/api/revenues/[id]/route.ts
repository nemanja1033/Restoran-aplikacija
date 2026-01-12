import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { incomeSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { getSettings } from "@/lib/data";
import { calculateDeliveryFee } from "@/lib/calculations";
import { getAccountIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const accountId = await getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = incomeSchema.parse(body);
    const existing = await prisma.income.findFirst({
      where: { id: Number(id), accountId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Prihod nije pronađen." }, { status: 404 });
    }
    const settings = await getSettings(accountId);

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
    const accountId = await getAccountIdFromRequest(_request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const deleted = await prisma.income.deleteMany({
      where: { id: Number(id), accountId },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Prihod nije pronađen." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje prihoda." },
      { status: 400 }
    );
  }
}
