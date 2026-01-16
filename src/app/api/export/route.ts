import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getExpenses, getIncomes, getSuppliers } from "@/lib/data";
import { getAccountIdFromRequest } from "@/lib/auth";
import { format, parseISO, subDays } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRange(searchParams: URLSearchParams) {
  const today = new Date();
  const defaultFrom = format(subDays(today, 29), "yyyy-MM-dd");
  const defaultTo = format(today, "yyyy-MM-dd");

  return {
    from: searchParams.get("from") ?? defaultFrom,
    to: searchParams.get("to") ?? defaultTo,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { from, to } = getRange(searchParams);
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  const [incomes, expenses, suppliers] = await Promise.all([
    getIncomes(accountId, from, to),
    getExpenses(accountId, from, to),
    getSuppliers(accountId),
  ]);

  type IncomeItem = Awaited<ReturnType<typeof getIncomes>>[number];
  type ExpenseItem = Awaited<ReturnType<typeof getExpenses>>[number];
  const transactions = [
    ...incomes.map((income: IncomeItem) => {
      return {
        Datum: format(income.date, "yyyy-MM-dd"),
        Tip: "Prihod",
        Opis: income.note ?? "",
        Bruto: Number(income.amount.toString()),
        Neto: Number(income.netAmount.toString()),
        "PDV %": 0,
        "PDV iznos": 0,
        Kanal: income.channel === "DELIVERY" ? "Dostava" : "Lokal",
        Dobavljač: "-",
        "Plaćeno odmah": "-",
        "Račun link": "-",
      };
    }),
    ...expenses.map((expense: ExpenseItem) => {
      const contributions = Number(expense.contributionsAmount?.toString?.() ?? "0");
      const totalCash =
        expense.type === "SALARY" ? Number(expense.grossAmount.toString()) + contributions : Number(expense.grossAmount.toString());
      return {
      Datum: format(expense.date, "yyyy-MM-dd"),
      Tip: expense.type === "SUPPLIER_PAYMENT" ? "Uplata dobavljaču" : "Trošak",
      Opis: expense.note ?? "",
      Bruto: Number(expense.grossAmount.toString()),
      Doprinosi: contributions || "",
      "Ukupno isplata": expense.type === "SALARY" ? totalCash : "",
      Neto: Number(expense.netAmount.toString()),
      "PDV %": Number(expense.pdvPercent.toString()),
      "PDV iznos": Number(expense.pdvAmount.toString()),
      Kanal: "-",
      Dobavljač: expense.supplier
        ? expense.supplier.name
          ? `${expense.supplier.name} (#${expense.supplier.number})`
          : `Dobavljač #${expense.supplier.number}`
        : "-",
      "Plaćeno odmah": expense.type === "SUPPLIER" ? (expense.paidNow ? "Da" : "Ne") : "Da",
      "Račun link": expense.receiptId ? `/api/receipts/${expense.receiptId}` : "-",
      };
    }),
  ].sort((a, b) =>
    parseISO(a.Datum).getTime() - parseISO(b.Datum).getTime()
  );

  const transactionsSheet = XLSX.utils.json_to_sheet(transactions);

  const supplierTotals = suppliers.map((supplier) => {
    const openingBalance = Number(supplier.openingBalance.toString());
    const purchased = expenses
      .filter((expense) => expense.supplierId === supplier.id && expense.type === "SUPPLIER")
      .reduce((sum, expense) => sum + Number(expense.grossAmount.toString()), 0);
    const paid = expenses
      .filter((expense) => expense.supplierId === supplier.id)
      .reduce((sum, expense) => {
        if (expense.type === "SUPPLIER" && expense.paidNow) {
          return sum + Number(expense.grossAmount.toString());
        }
        if (expense.type === "SUPPLIER_PAYMENT") {
          return sum + Number(expense.grossAmount.toString());
        }
        return sum;
      }, 0);
    return {
      Naziv: supplier.name ?? `Dobavljač #${supplier.number}`,
      Kategorija:
        supplier.category === "MEAT"
          ? "Meso"
          : supplier.category === "VEGETABLES"
          ? "Povrće"
          : supplier.category === "PACKAGING"
          ? "Ambalaža"
          : "Ostalo",
      "PDV %": supplier.pdvPercent ? Number(supplier.pdvPercent.toString()) : "",
      "Kupljeno (bruto)": purchased + openingBalance,
      "Plaćeno": paid,
      "Dugovanje": purchased + openingBalance - paid,
    };
  });

  const suppliersSheet = XLSX.utils.json_to_sheet(supplierTotals);

  const pdvByMonth = new Map<string, { gross: number; net: number; pdv: number }>();
  for (const expense of expenses) {
    const key = format(expense.date, "yyyy-MM");
    const entry = pdvByMonth.get(key) ?? { gross: 0, net: 0, pdv: 0 };
    entry.gross += Number(expense.grossAmount.toString());
    entry.net += Number(expense.netAmount.toString());
    entry.pdv += Number(expense.pdvAmount.toString());
    pdvByMonth.set(key, entry);
  }

  const pdvRows = Array.from(pdvByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      Mesec: month,
      "Ukupno bruto": values.gross,
      "Ukupno neto": values.net,
      "Ukupno PDV": values.pdv,
    }));

  const pdvSheet = XLSX.utils.json_to_sheet(pdvRows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Knjiga");
  XLSX.utils.book_append_sheet(workbook, suppliersSheet, "Dobavljači");
  XLSX.utils.book_append_sheet(workbook, pdvSheet, "PDV");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const filename = `finance_export_${from}_to_${to}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
    },
  });
}
