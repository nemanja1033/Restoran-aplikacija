import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { supplierSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await ensureSchema();
  let suppliers = await prisma.supplier.findMany({
    orderBy: { number: "asc" },
  });

  if (suppliers.length === 0) {
    await prisma.supplier.createMany({
      data: [{ number: 1, name: null }, { number: 2, name: null }],
    });
    suppliers = await prisma.supplier.findMany({
      orderBy: { number: "asc" },
    });
  }

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const supplier = await prisma.supplier.create({
      data: {
        number: parsed.number,
        name: parsed.name || null,
      },
    });

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno dodavanje dobavljača." },
      { status: 400 }
    );
  }
}
