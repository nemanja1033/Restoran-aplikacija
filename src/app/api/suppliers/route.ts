import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { number: "asc" },
  });
  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  try {
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
