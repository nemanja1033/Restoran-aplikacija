import path from "path";
import { promises as fs } from "fs";

export type StoredFile = {
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

export interface StorageProvider {
  save(file: File): Promise<StoredFile>;
}

class LocalStorageProvider implements StorageProvider {
  private uploadDir =
    process.env.VERCEL === "1"
      ? path.join("/tmp", "uploads")
      : path.join(process.cwd(), "public", "uploads");

  async save(file: File): Promise<StoredFile> {
    await fs.mkdir(this.uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `${Date.now()}_${safeName}`;
    const diskPath = path.join(this.uploadDir, fileName);

    await fs.writeFile(diskPath, buffer);

    return {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
      storagePath: diskPath,
    };
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider() {
  if (!provider) {
    provider = new LocalStorageProvider();
  }
  return provider;
}
