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
            category TEXT NOT NULL DEFAULT 'OTHER',
            pdvPercent NUMERIC,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Revenue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            channel TEXT NOT NULL DEFAULT 'LOCAL',
            feePercent NUMERIC NOT NULL DEFAULT 0,
            feeAmount NUMERIC NOT NULL DEFAULT 0,
            netAmount NUMERIC NOT NULL DEFAULT 0,
            note TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Expense (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            netAmount NUMERIC NOT NULL DEFAULT 0,
            pdvPercent NUMERIC NOT NULL DEFAULT 0,
            pdvAmount NUMERIC NOT NULL DEFAULT 0,
            type TEXT NOT NULL DEFAULT 'SUPPLIER',
            supplierId INTEGER,
            note TEXT,
            paidNow INTEGER NOT NULL DEFAULT 0,
            receiptId INTEGER,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (supplierId) REFERENCES Supplier(id),
            FOREIGN KEY (receiptId) REFERENCES Receipt(id)
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Payment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount NUMERIC NOT NULL,
            supplierId INTEGER,
            note TEXT,
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (supplierId) REFERENCES Supplier(id)
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Receipt (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fileName TEXT NOT NULL,
            mimeType TEXT NOT NULL,
            size INTEGER NOT NULL,
            storagePath TEXT NOT NULL,
            createdAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
        prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS Settings (
            id INTEGER PRIMARY KEY NOT NULL,
            openingBalance NUMERIC NOT NULL DEFAULT 0,
            defaultPdvPercent NUMERIC NOT NULL DEFAULT 0,
            defaultDeliveryFeePercent NUMERIC NOT NULL DEFAULT 0,
            currency TEXT NOT NULL DEFAULT 'RSD',
            createdAt TEXT NOT NULL DEFAULT (datetime('now')),
            updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
          );`
        ),
      ]);

      const alterStatements = [
        `ALTER TABLE Supplier ADD COLUMN category TEXT NOT NULL DEFAULT 'OTHER';`,
        `ALTER TABLE Supplier ADD COLUMN pdvPercent NUMERIC;`,
        `ALTER TABLE Revenue ADD COLUMN channel TEXT NOT NULL DEFAULT 'LOCAL';`,
        `ALTER TABLE Revenue ADD COLUMN feePercent NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Revenue ADD COLUMN feeAmount NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Revenue ADD COLUMN netAmount NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Expense ADD COLUMN netAmount NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Expense ADD COLUMN pdvPercent NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Expense ADD COLUMN pdvAmount NUMERIC NOT NULL DEFAULT 0;`,
        `ALTER TABLE Expense ADD COLUMN type TEXT NOT NULL DEFAULT 'SUPPLIER';`,
        `ALTER TABLE Expense ADD COLUMN paidNow BOOLEAN NOT NULL DEFAULT 0;`,
        `ALTER TABLE Expense ADD COLUMN receiptId INTEGER;`,
        `ALTER TABLE Settings ADD COLUMN defaultPdvPercent NUMERIC NOT NULL DEFAULT 0;`,
      ];

      for (const statement of alterStatements) {
        try {
          await prisma.$executeRawUnsafe(statement);
        } catch {
          // Ignore if column already exists.
        }
      }

      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO Settings (id, openingBalance, defaultPdvPercent, defaultDeliveryFeePercent, currency, createdAt, updatedAt)
         VALUES (1, 0, 0, 0, 'RSD', datetime('now'), datetime('now'));`
      );
      await prisma.$executeRawUnsafe(
        `UPDATE Settings SET defaultPdvPercent = 0 WHERE defaultPdvPercent IS NULL;`
      );
    })().catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }

  await bootstrapPromise;
}
