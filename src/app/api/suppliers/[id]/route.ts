import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const supplier = await prisma.supplier.update({
      where: { id: Number(id) },
      data: {
        number: parsed.number,
        name: parsed.name || null,
      },
    });

    return NextResponse.json(supplier);
  } catch {
    return NextResponse.json(
      { error: "Neuspešno ažuriranje dobavljača." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.supplier.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje dobavljača." },
      { status: 400 }
    );
  }
}
