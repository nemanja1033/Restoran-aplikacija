import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensureSchema();
    await prisma.$transaction([
      prisma.income.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.receipt.deleteMany(),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno resetovanje podataka." },
      { status: 500 }
    );
  }
}
