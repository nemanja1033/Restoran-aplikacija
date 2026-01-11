import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { revenueSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const body = await request.json();
    const parsed = revenueSchema.parse(body);

    const feePercent =
      parsed.type === "DELIVERY"
        ? decimalFromString(parsed.feePercent ?? "0")
        : decimalFromString("0");

    const revenue = await prisma.revenue.update({
      where: { id: Number(id) },
      data: {
        date: parseDateString(parsed.date),
        amount: decimalFromString(parsed.amount),
        type: parsed.type,
        feePercent,
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
    await prisma.revenue.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje prihoda." },
      { status: 400 }
    );
  }
}
