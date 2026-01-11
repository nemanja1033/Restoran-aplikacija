import { prisma } from "@/lib/db";

let bootstrapPromise: Promise<void> | null = null;

export async function ensureSchema() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON;");

      await prisma.$transaction([
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Supplier (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number INTEGER NOT NULL,
            name TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Revenue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            type TEXT NOT NULL,
            feePercent NUMERIC NOT NULL,
            note TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Expense (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            supplierId INTEGER NOT NULL,
            amount NUMERIC NOT NULL,
            paymentMethod TEXT NOT NULL,
            note TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (supplierId) REFERENCES Supplier(id)
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Settings (
            id INTEGER PRIMARY KEY NOT NULL,
            openingBalance NUMERIC NOT NULL DEFAULT 0,
            defaultDeliveryFeePercent NUMERIC NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'RSD',
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO Settings (id, openingBalance, defaultDeliveryFeePercent, currency, createdAt, updatedAt)
           VALUES (1, 0, 0, 'RSD', datetime('now'), datetime('now'));`
        ),
      ]);
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}
