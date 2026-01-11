import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { incomeSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { parseISO } from "date-fns";
import { getSettings } from "@/lib/data";
import { calculateDeliveryFee } from "@/lib/calculations";
import { getSessionAccountId } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const summary = searchParams.get("summary") === "1";
  const accountId = await getSessionAccountId();
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }

  if (summary && !from && !to) {
    const [revenues, settings] = await Promise.all([
      prisma.income.findMany({ where: { accountId }, orderBy: { date: "desc" } }),
      getSettings(accountId),
    ]);

    return NextResponse.json({ revenues, settings });
  }

  const where =
    from && to
      ? {
          accountId,
          date: {
            gte: parseISO(from),
            lte: parseISO(to),
          },
        }
      : { accountId };

  const revenues = await prisma.income.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(revenues);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = incomeSchema.parse(body);
    const settings = await getSettings(accountId);

    const feePercent =
      parsed.channel === "DELIVERY"
        ? decimalFromString(parsed.feePercent ?? settings.deliveryFeePercent.toString())
        : decimalFromString("0");
    const amount = decimalFromString(parsed.amount);
    const { feeAmount, netAmount } =
      parsed.channel === "DELIVERY"
        ? calculateDeliveryFee(amount, feePercent)
        : { feeAmount: decimalFromString("0"), netAmount: amount };

    const revenue = await prisma.income.create({
      data: {
        accountId,
        date: parseDateString(parsed.date),
        amount,
        channel: parsed.channel,
        feePercentApplied: feePercent,
        feeAmount,
        netAmount,
        note: parsed.note || null,
      },
    });

    return NextResponse.json(revenue);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje prihoda." },
      { status: 400 }
    );
  }
}
