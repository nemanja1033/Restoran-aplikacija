import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getSettings } from "@/lib/data";
import { settingsSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { getAccountIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const accountId = await getAccountIdFromRequest(request);
  if (!accountId) {
    return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
  }
  const settings = await getSettings(accountId);
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const accountId = await getAccountIdFromRequest(request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = settingsSchema.parse(body);

    const settings = await prisma.settings.upsert({
      where: { accountId },
      update: {
        startingBalance: decimalFromString(parsed.startingBalance),
        defaultPdvPercent: decimalFromString(parsed.defaultPdvPercent),
        deliveryFeePercent: decimalFromString(parsed.deliveryFeePercent),
        currency: parsed.currency,
      },
      create: {
        accountId,
        startingBalance: decimalFromString(parsed.startingBalance),
        defaultPdvPercent: decimalFromString(parsed.defaultPdvPercent),
        deliveryFeePercent: decimalFromString(parsed.deliveryFeePercent),
        currency: parsed.currency,
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno čuvanje podešavanja." },
      { status: 400 }
    );
  }
}
