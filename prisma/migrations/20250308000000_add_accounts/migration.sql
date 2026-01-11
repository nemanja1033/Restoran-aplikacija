CREATE TABLE "Account" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Account_slug_key" ON "Account"("slug");

CREATE TABLE "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "accountId" INTEGER NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_accountId_idx" ON "User"("accountId");

ALTER TABLE "Supplier" ADD COLUMN "accountId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Revenue" ADD COLUMN "accountId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Expense" ADD COLUMN "accountId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Receipt" ADD COLUMN "accountId" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Settings" ADD COLUMN "accountId" INTEGER NOT NULL DEFAULT 1;

CREATE INDEX "Supplier_accountId_idx" ON "Supplier"("accountId");
CREATE INDEX "Revenue_accountId_idx" ON "Revenue"("accountId");
CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");
CREATE INDEX "Receipt_accountId_idx" ON "Receipt"("accountId");
CREATE UNIQUE INDEX "Settings_accountId_key" ON "Settings"("accountId");

INSERT OR IGNORE INTO "Account" ("id", "name", "slug", "createdAt")
VALUES (1, 'Flat Burger', 'flatburger', CURRENT_TIMESTAMP);

UPDATE "Settings" SET "accountId" = 1 WHERE "accountId" IS NULL;
UPDATE "Supplier" SET "accountId" = 1 WHERE "accountId" IS NULL;
UPDATE "Revenue" SET "accountId" = 1 WHERE "accountId" IS NULL;
UPDATE "Expense" SET "accountId" = 1 WHERE "accountId" IS NULL;
UPDATE "Receipt" SET "accountId" = 1 WHERE "accountId" IS NULL;
