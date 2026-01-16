import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { expenseSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { parseISO } from "date-fns";
import { getSettings } from "@/lib/data";
import { Decimal } from "@prisma/client/runtime/client";
import { calculatePdvBreakdown } from "@/lib/calculations";
import { getAccountIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const summary = searchParams.get("summary") === "1";
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  if (summary && !from && !to) {
    const [expenses, suppliers, settings] = await Promise.all([
      prisma.expense.findMany({
        where: { accountId },
        include: { supplier: true, receipt: true },
        orderBy: { date: "desc" },
      }),
      prisma.supplier.findMany({ where: { accountId }, orderBy: { number: "asc" } }),
      getSettings(accountId),
    ]);

    return NextResponse.json({ expenses, suppliers, settings });
  }

  const where =
    from && to
      ? {
          accountId,
          date: {
            gte: parseISO(`${from}T00:00:00`),
            lte: parseISO(`${to}T23:59:59`),
          },
        }
      : { accountId };

  const expenses = await prisma.expense.findMany({
    where,
    include: { supplier: true, receipt: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const accountId = await getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

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

    const expense = await prisma.expense.create({
      data: {
        accountId,
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
      { error: "Neuspešno dodavanje troška." },
      { status: 400 }
    );
  }
}
