import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { revenueSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { parseDateString } from "@/lib/format";
import { parseISO } from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  await ensureSchema();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? {
          date: {
            gte: parseISO(from),
            lte: parseISO(to),
          },
        }
      : undefined;

  const revenues = await prisma.revenue.findMany({
    where,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(revenues);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = revenueSchema.parse(body);

    const feePercent =
      parsed.type === "DELIVERY"
        ? decimalFromString(parsed.feePercent ?? "0")
        : decimalFromString("0");

    const revenue = await prisma.revenue.create({
      data: {
        date: parseDateString(parsed.date),
        amount: decimalFromString(parsed.amount),
        type: parsed.type,
        feePercent,
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
