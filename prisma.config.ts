import "dotenv/config";
import path from "path";
import { defineConfig } from "prisma/config";

const fallbackPath = path.join(process.cwd(), "dev.db");
const fallbackUrl = `file:${encodeURI(fallbackPath)}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackUrl,
  },
  migrations: {
    seed: "ts-node --compiler-options {\\\"module\\\":\\\"CommonJS\\\"} prisma/seed.ts",
  },
});
