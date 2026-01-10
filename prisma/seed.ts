import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const adapter = databaseUrl.startsWith("libsql:")
  ? new PrismaLibSql(
      createClient({
        url: databaseUrl,
        authToken: process.env.LIBSQL_AUTH_TOKEN,
      })
    )
  : new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

function dateOnly(offsetDays: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      openingBalance: new Prisma.Decimal("15000.00"),
      defaultDeliveryFeePercent: new Prisma.Decimal("25.00"),
      currency: "RSD",
    },
    create: {
      id: 1,
      openingBalance: new Prisma.Decimal("15000.00"),
      defaultDeliveryFeePercent: new Prisma.Decimal("25.00"),
      currency: "RSD",
    },
  });

  await prisma.expense.deleteMany();
  await prisma.revenue.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers = await prisma.$transaction([
    prisma.supplier.create({ data: { number: 1, name: "Meso" } }),
    prisma.supplier.create({ data: { number: 2, name: "Peciva" } }),
    prisma.supplier.create({ data: { number: 3, name: "Piće" } }),
  ]);

  const revenues: Prisma.RevenueCreateManyInput[] = [
    {
      date: dateOnly(6),
      amount: new Prisma.Decimal("42000.00"),
      type: "IN_STORE",
      feePercent: new Prisma.Decimal("0"),
      note: "Ručak u lokalu",
    },
    {
      date: dateOnly(6),
      amount: new Prisma.Decimal("18000.00"),
      type: "DELIVERY",
      feePercent: new Prisma.Decimal("25"),
      note: "Dostava - platforma A",
    },
    {
      date: dateOnly(5),
      amount: new Prisma.Decimal("38000.00"),
      type: "IN_STORE",
      feePercent: new Prisma.Decimal("0"),
      note: "Večera u lokalu",
    },
    {
      date: dateOnly(5),
      amount: new Prisma.Decimal("22000.00"),
      type: "DELIVERY",
      feePercent: new Prisma.Decimal("22"),
      note: "Dostava - platforma B",
    },
    {
      date: dateOnly(4),
      amount: new Prisma.Decimal("45000.00"),
      type: "IN_STORE",
      feePercent: new Prisma.Decimal("0"),
      note: "Specijalni meni",
    },
    {
      date: dateOnly(3),
      amount: new Prisma.Decimal("26000.00"),
      type: "DELIVERY",
      feePercent: new Prisma.Decimal("25"),
      note: "Dostava - vikend",
    },
    {
      date: dateOnly(2),
      amount: new Prisma.Decimal("41000.00"),
      type: "IN_STORE",
      feePercent: new Prisma.Decimal("0"),
      note: "Korporativni ručak",
    },
    {
      date: dateOnly(1),
      amount: new Prisma.Decimal("19500.00"),
      type: "DELIVERY",
      feePercent: new Prisma.Decimal("24"),
      note: "Dostava - platforma A",
    },
    {
      date: dateOnly(0),
      amount: new Prisma.Decimal("47000.00"),
      type: "IN_STORE",
      feePercent: new Prisma.Decimal("0"),
      note: "Današnji promet",
    },
  ];

  const expenses: Prisma.ExpenseCreateManyInput[] = [
    {
      date: dateOnly(6),
      supplierId: suppliers[0].id,
      amount: new Prisma.Decimal("12000.00"),
      paymentMethod: "ACCOUNT",
      note: "Sirovo meso",
    },
    {
      date: dateOnly(6),
      supplierId: suppliers[1].id,
      amount: new Prisma.Decimal("3400.00"),
      paymentMethod: "CASH",
      note: "Peciva za sendviče",
    },
    {
      date: dateOnly(5),
      supplierId: suppliers[2].id,
      amount: new Prisma.Decimal("5200.00"),
      paymentMethod: "ACCOUNT",
      note: "Sokovi i voda",
    },
    {
      date: dateOnly(4),
      supplierId: suppliers[1].id,
      amount: new Prisma.Decimal("4600.00"),
      paymentMethod: "ACCOUNT",
      note: "Hleb i peciva",
    },
    {
      date: dateOnly(3),
      supplierId: suppliers[0].id,
      amount: new Prisma.Decimal("9800.00"),
      paymentMethod: "ACCOUNT",
      note: "Piletina",
    },
    {
      date: dateOnly(2),
      supplierId: suppliers[2].id,
      amount: new Prisma.Decimal("3100.00"),
      paymentMethod: "CASH",
      note: "Sokovi - gotovina",
    },
    {
      date: dateOnly(1),
      supplierId: suppliers[0].id,
      amount: new Prisma.Decimal("11500.00"),
      paymentMethod: "ACCOUNT",
      note: "Riba",
    },
  ];

  await prisma.revenue.createMany({ data: revenues });
  await prisma.expense.createMany({ data: expenses });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
