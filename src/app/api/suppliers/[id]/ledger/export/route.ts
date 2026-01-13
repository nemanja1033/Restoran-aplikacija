import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getAccountIdFromRequest } from "@/lib/auth";
import { buildSupplierLedger } from "@/lib/supplier-ledger";

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

  const transactions = await prisma.supplierTransaction.findMany({
    where: { accountId, supplierId: supplier.id },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const { rows } = buildSupplierLedger({
    transactions,
    legacyPdvPercent,
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

  const exportRows = filteredRows.map((row) => ({
    Datum: format(row.date, "yyyy-MM-dd"),
    Tip:
      row.type === "RACUN"
        ? "Račun"
        : row.type === "UPLATA"
        ? "Uplata"
        : "Korekcija",
    Opis: row.description,
    "Broj računa": row.invoiceNumber ?? "",
    Neto: Number(row.netAmount.toString()),
    "PDV %": Number(row.vatRate.toString()),
    "PDV iznos": Number(row.pdvAmount.toString()),
    Bruto: Number(row.grossAmount.toString()),
    Stanje: Number(row.runningBalance.toString()),
  }));

  const sheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Dobavljač");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `dobavljac_${supplier.id}_ledger.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
