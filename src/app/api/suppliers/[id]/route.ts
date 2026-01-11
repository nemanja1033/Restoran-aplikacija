import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { supplierSchema } from "@/lib/validations";
import { decimalFromString } from "@/lib/prisma-helpers";
import { getSessionAccountId } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const body = await request.json();
    const parsed = supplierSchema.parse(body);

    const existing = await prisma.supplier.findFirst({
      where: { id: Number(id), accountId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Dobavljač nije pronađen." }, { status: 404 });
    }
    const supplier = await prisma.supplier.update({
      where: { id: Number(id) },
      data: {
        number: parsed.number,
        name: parsed.name || null,
        category: parsed.category,
        pdvPercent: parsed.pdvPercent ? decimalFromString(parsed.pdvPercent) : null,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const accountId = await getSessionAccountId();
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const deleted = await prisma.supplier.deleteMany({
      where: { id: Number(id), accountId },
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Dobavljač nije pronađen." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno brisanje dobavljača." },
      { status: 400 }
    );
  }
}
