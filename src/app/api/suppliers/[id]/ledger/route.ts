import { NextResponse } from "next/server";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getAccountIdFromRequest } from "@/lib/auth";
import { buildSupplierLedger } from "@/lib/supplier-ledger";
import { getSettings } from "@/lib/data";
import { parseISO } from "date-fns";
import { supplierTransactionSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const legacyPdvPercent = new Decimal(10);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema();
  const { id } = await params;
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }
  const supplier = await prisma.supplier.findFirst({
    where: { id: Number(id), accountId },
  });
  if (!supplier) {
    return NextResponse.json({ error: "Dobavljač nije pronađen." }, { status: 404 });
  }

  const settings = await getSettings(accountId);
  const resolvedPdvPercent =
    supplier.pdvPercent ?? settings.defaultPdvPercent ?? legacyPdvPercent;

  const transactions = await prisma.supplierTransaction.findMany({
    where: { accountId, supplierId: supplier.id },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const { rows, summary } = buildSupplierLedger({
    transactions,
    legacyPdvPercent,
    openingBalance: supplier.openingBalance,
    openingBalanceDate: supplier.createdAt,
  });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromDate = from ? parseISO(`${from}T00:00:00`) : null;
  const toDate = to ? parseISO(`${to}T23:59:59`) : null;

  const filteredRows = rows.filter((row) => {
    if (type && type !== "ALL" && row.type !== type) return false;
    if (fromDate && row.date < fromDate) {
      return false;
    }
    if (toDate && row.date > toDate) {
      return false;
    }
    if (query) {
      const description = row.description.toLowerCase();
      const invoiceNumber = row.invoiceNumber?.toLowerCase() ?? "";
      if (!description.includes(query) && !invoiceNumber.includes(query)) {
        return false;
      }
    }
    return true;
  });

  return NextResponse.json({
    supplier,
    settings: {
      currency: settings.currency,
      defaultPdvPercent: settings.defaultPdvPercent.toString(),
    },
    resolvedPdvPercent: Number(resolvedPdvPercent.toString()),
    summary: {
      totalInvoiced: Number(summary.totalInvoiced.toString()),
      totalPaid: Number(summary.totalPaid.toString()),
      outstanding: Number(summary.outstanding.toString()),
      totalNet: Number(summary.totalNet.toString()),
      totalPdv: Number(summary.totalPdv.toString()),
      totalGross: Number(summary.totalGross.toString()),
    },
    transactions: filteredRows.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      type: row.type,
      description: row.description,
      invoiceNumber: row.invoiceNumber,
      grossAmount: Number(row.grossAmount.toString()),
      netAmount: Number(row.netAmount.toString()),
      pdvAmount: Number(row.pdvAmount.toString()),
      vatRate: Number(row.vatRate.toString()),
      runningBalance: Number(row.runningBalance.toString()),
    })),
  });
}

export async function POST(
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
    const supplier = await prisma.supplier.findFirst({
      where: { id: Number(id), accountId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Dobavljač nije pronađen." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = supplierTransactionSchema.parse({
      ...body,
      supplierId: Number(id),
    });

    const settings = await getSettings(accountId);
    const isPayment = parsed.type === "UPLATA";
    const vatRate = isPayment
      ? new Decimal(0)
      : parsed.vatRate
      ? decimalFromString(parsed.vatRate)
      : supplier.pdvPercent ?? settings.defaultPdvPercent ?? legacyPdvPercent;

    const transaction = await prisma.supplierTransaction.create({
      data: {
        accountId,
        supplierId: supplier.id,
        type: parsed.type,
        amount: decimalFromString(parsed.amount),
        vatRate,
        description: parsed.description,
        invoiceNumber: parsed.invoiceNumber || null,
        date: parseDateString(parsed.date),
      },
    });

    return NextResponse.json(transaction);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje stavke." },
      { status: 400 }
    );
  }
}
