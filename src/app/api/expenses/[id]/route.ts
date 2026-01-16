import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { getSettings } from "@/lib/data";
import { Decimal } from "@prisma/client/runtime/client";
import { calculatePdvBreakdown } from "@/lib/calculations";
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
    const parsed = expenseSchema.parse(body);

    const existing = await prisma.expense.findFirst({
      where: { id: Number(id), accountId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Trošak nije pronađen." }, { status: 404 });
    }
    const settings = await getSettings(accountId);
    const supplier = parsed.supplierId
      ? await prisma.supplier.findFirst({ where: { id: parsed.supplierId, accountId } })
      : null;
    if (parsed.supplierId && !supplier) {
      return NextResponse.json({ error: "Dobavljač nije pronađen." }, { status: 404 });
    }
    if (parsed.receiptId) {
      const receipt = await prisma.receipt.findFirst({
        where: { id: parsed.receiptId, accountId },
      });
      if (!receipt) {
        return NextResponse.json({ error: "Račun nije pronađen." }, { status: 404 });
      }
    }

    const isSupplierPayment = parsed.type === "SUPPLIER_PAYMENT";
    const pdvPercent = isSupplierPayment
      ? new Decimal(0)
      : parsed.pdvPercent
      ? decimalFromString(parsed.pdvPercent)
      : supplier?.pdvPercent ??
        (parsed.type === "SUPPLIER" || parsed.type === "OTHER"
          ? settings.defaultPdvPercent
          : new Decimal(0));

    const grossAmount = decimalFromString(parsed.grossAmount);
    const contributionsAmount =
      parsed.type === "SALARY" && parsed.contributionsAmount
        ? decimalFromString(parsed.contributionsAmount)
        : new Decimal(0);
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
        contributionsAmount,
        netAmount,
        pdvPercent,
        pdvAmount,
        type: parsed.type,
        note: parsed.note || null,
        paidNow: isSupplierPayment ? true : Boolean(parsed.paidNow),
        receiptId: parsed.receiptId ?? null,
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
    await ensureSchema();
    const { id } = await params;
    const accountId = await getAccountIdFromRequest(_request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const deleted = await prisma.expense.deleteMany({
      where: { id: Number(id), accountId },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Trošak nije pronađen." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje troška." },
      { status: 400 }
    );
  }
}
