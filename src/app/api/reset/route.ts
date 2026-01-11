import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getSessionAccountId } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await ensureSchema();
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    await prisma.$transaction([
      prisma.income.deleteMany({ where: { accountId } }),
      prisma.expense.deleteMany({ where: { accountId } }),
      prisma.receipt.deleteMany({ where: { accountId } }),
    ]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno resetovanje podataka." },
      { status: 500 }
    );
  }
}
