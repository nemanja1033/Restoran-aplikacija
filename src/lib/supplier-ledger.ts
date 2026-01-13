import { Decimal } from "@prisma/client/runtime/client";
import { calculatePdvBreakdown } from "@/lib/calculations";

export type SupplierLedgerRow = {
  id: number;
  date: Date;
  type: "RACUN" | "UPLATA" | "KOREKCIJA";
  description: string;
  invoiceNumber: string | null;
  grossAmount: Decimal;
  netAmount: Decimal;
  pdvAmount: Decimal;
  vatRate: Decimal;
  runningBalance: Decimal;
};

export type SupplierLedgerSummary = {
  totalInvoiced: Decimal;
  totalPaid: Decimal;
  outstanding: Decimal;
  totalNet: Decimal;
  totalPdv: Decimal;
  totalGross: Decimal;
};

type SupplierTransactionLike = {
  id: number;
  date: Date;
  type: "RACUN" | "UPLATA" | "KOREKCIJA";
  amount: Decimal;
  vatRate: Decimal | null;
  description: string;
  invoiceNumber: string | null;
  createdAt: Date;
};

function decimal(value: Decimal | number | string) {
  return new Decimal(value);
}

export function buildSupplierLedger({
  transactions,
  legacyPdvPercent,
}: {
  transactions: SupplierTransactionLike[];
  legacyPdvPercent: Decimal;
}) {
  const rows: SupplierLedgerRow[] = [];
  let running = decimal(0);
  let totalInvoiced = decimal(0);
  let totalPaid = decimal(0);
  let totalNet = decimal(0);
  let totalPdv = decimal(0);
  let totalGross = decimal(0);

  const sorted = [...transactions].sort((a, b) => {
    if (a.date.getTime() !== b.date.getTime()) {
      return a.date.getTime() - b.date.getTime();
    }
    if (a.createdAt.getTime() !== b.createdAt.getTime()) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    return a.id - b.id;
  });

  for (const entry of sorted) {
    const isPayment = entry.type === "UPLATA";
    const vatRate = entry.vatRate ?? legacyPdvPercent;
    const grossAmount = entry.amount;
    const { netAmount, pdvAmount } = isPayment
      ? { netAmount: grossAmount, pdvAmount: decimal(0) }
      : calculatePdvBreakdown(grossAmount, vatRate);

    if (isPayment) {
      running = running.minus(grossAmount);
      totalPaid = totalPaid.plus(grossAmount);
    } else {
      running = running.plus(grossAmount);
      totalInvoiced = totalInvoiced.plus(grossAmount);
      totalNet = totalNet.plus(netAmount);
      totalPdv = totalPdv.plus(pdvAmount);
      totalGross = totalGross.plus(grossAmount);
    }

    rows.push({
      id: entry.id,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      invoiceNumber: entry.invoiceNumber,
      grossAmount,
      netAmount,
      pdvAmount,
      vatRate,
      runningBalance: running,
    });
  }

  const outstanding = totalInvoiced.minus(totalPaid);

  return {
    rows,
    summary: {
      totalInvoiced,
      totalPaid,
      outstanding,
      totalNet,
      totalPdv,
      totalGross,
    },
  };
}
