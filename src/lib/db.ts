import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  (process.env.NODE_ENV === "production" ? "" : "file:./dev.db");

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required in production. Set it to your libsql:// connection string."
  );
}

if (process.env.NODE_ENV === "production" && databaseUrl.startsWith("file:")) {
  throw new Error(
    "SQLite file URLs are not supported on Vercel. Use a libsql:// DATABASE_URL."
  );
}

const useLibSql = databaseUrl.startsWith("libsql:");

const adapter = useLibSql
  ? new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    })
  : new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
