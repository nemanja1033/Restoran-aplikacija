import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const useLibSql = databaseUrl.startsWith("libsql:");

const adapter = useLibSql
  ? new PrismaLibSQL(
      createClient({
        url: databaseUrl,
        authToken: process.env.LIBSQL_AUTH_TOKEN,
      })
    )
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
