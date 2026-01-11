import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getSettings } from "@/lib/data";
import { settingsSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = settingsSchema.parse(body);

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        openingBalance: decimalFromString(parsed.openingBalance),
        defaultDeliveryFeePercent: decimalFromString(
          parsed.defaultDeliveryFeePercent
        ),
        currency: parsed.currency,
      },
      create: {
        id: 1,
        openingBalance: decimalFromString(parsed.openingBalance),
        defaultDeliveryFeePercent: decimalFromString(
          parsed.defaultDeliveryFeePercent
        ),
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
