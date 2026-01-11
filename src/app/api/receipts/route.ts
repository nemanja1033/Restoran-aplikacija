import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/bootstrap";
import { getStorageProvider } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Fajl nije pronađen." },
        { status: 400 }
      );
    }

    const storage = getStorageProvider();
    const stored = await storage.save(file);

    const receipt = await prisma.receipt.create({
      data: {
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        size: stored.size,
        storagePath: stored.storagePath,
      },
    });

    return NextResponse.json(receipt);
  } catch {
    return NextResponse.json(
      { error: "Neuspešan upload računa." },
      { status: 400 }
    );
  }
}
