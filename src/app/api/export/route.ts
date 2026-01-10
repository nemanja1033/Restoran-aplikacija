import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getExpenses, getRevenues, getSettings } from "@/lib/data";
import { buildDailyLedger } from "@/lib/ledger";
import { format, parseISO, subDays } from "date-fns";

export const runtime = "nodejs";

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

  const settings = await getSettings();
  const [revenues, expenses] = await Promise.all([
    getRevenues(from, to),
    getExpenses(from, to),
  ]);

  const ledger = buildDailyLedger({
    openingBalance: settings.openingBalance,
    revenues,
    expenses,
    from,
    to,
  });

  const ledgerSheet = XLSX.utils.json_to_sheet(
    ledger.map((row) => ({
      Datum: row.date,
      "Prihod u lokalu": row.totalInStoreGross,
      "Prihod od dostave": row.totalDeliveryGross,
      "Provizija dostave": row.deliveryFeeTotal,
      "Neto prihod": row.totalRevenueNet,
      "Troškovi sa računa": row.expensesFromAccount,
      "Troškovi gotovina": row.expensesCash,
      "Neto promena": row.dailyNetChangeOnAccount,
      "Stanje na računu": row.runningBalance,
    }))
  );

  const transactions = [
    ...revenues.map((revenue) => {
      const fee = revenue.amount.mul(revenue.feePercent).div(100);
      const net = revenue.amount.minus(fee);
      return {
        Datum: format(revenue.date, "yyyy-MM-dd"),
        Tip: revenue.type === "DELIVERY" ? "Prihod - dostava" : "Prihod - lokal",
        Iznos: Number(revenue.amount.toString()),
        "Provizija": Number(fee.toString()),
        "Neto iznos": Number(net.toString()),
        "Način plaćanja": "-",
        Dobavljač: "-",
        Beleška: revenue.note ?? "",
      };
    }),
    ...expenses.map((expense) => ({
      Datum: format(expense.date, "yyyy-MM-dd"),
      Tip: "Trošak",
      Iznos: Number(expense.amount.toString()),
      "Provizija": 0,
      "Neto iznos": Number(expense.amount.toString()) * -1,
      "Način plaćanja":
        expense.paymentMethod === "ACCOUNT" ? "Račun" : "Gotovina",
      Dobavljač: expense.supplier.name
        ? `${expense.supplier.name} (#${expense.supplier.number})`
        : `Dobavljač #${expense.supplier.number}`,
      Beleška: expense.note ?? "",
    })),
  ].sort((a, b) =>
    parseISO(a.Datum).getTime() - parseISO(b.Datum).getTime()
  );

  const transactionsSheet = XLSX.utils.json_to_sheet(transactions);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ledgerSheet, "Dnevni pregled");
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, "Transakcije");

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
