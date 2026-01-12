import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { promises as fs } from "fs";
import path from "path";
import { getAccountIdFromRequest } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function resolveLegacyPath(storagePath: string) {
  if (storagePath.startsWith("/uploads/")) {
    return path.join(process.cwd(), "public", storagePath);
  }
  return storagePath;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSchema();
    const { id } = await params;
    const accountId = await getAccountIdFromRequest(_request);
    if (!accountId) {
      return NextResponse.json({ error: "Neautorizovan pristup." }, { status: 401 });
    }
    const receipt = await prisma.receipt.findUnique({
      where: { id: Number(id) },
    });
    if (receipt && receipt.accountId !== accountId) {
      return NextResponse.json({ error: "Račun nije pronađen." }, { status: 404 });
    }

    if (!receipt) {
      return NextResponse.json({ error: "Račun nije pronađen." }, { status: 404 });
    }

    const filePath = resolveLegacyPath(receipt.storagePath);
    const buffer = await fs.readFile(filePath);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": receipt.mimeType,
        "Content-Disposition": `inline; filename="${receipt.fileName}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Neuspešno učitavanje računa." },
      { status: 400 }
    );
  }
}
