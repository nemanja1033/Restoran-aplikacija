import { ExpenseType, IncomeChannel, PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { Decimal } from "@prisma/client/runtime/client";
import bcrypt from "bcryptjs";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  "file:./dev.db";
const adapter = databaseUrl.startsWith("libsql:")
  ? new PrismaLibSql({
      url: databaseUrl,
      authToken: process.env.LIBSQL_AUTH_TOKEN,
    })
  : new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

function dateOnly(offsetDays: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

async function main() {
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("DEFAULT_ADMIN_PASSWORD nije postavljen.");
  }

  const account = await prisma.account.upsert({
    where: { slug: "flatburger" },
    update: {},
    create: {
      name: "Flat Burger",
      slug: "flatburger",
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.user.upsert({
    where: { username: "flatburger" },
    update: {
      accountId: account.id,
      passwordHash,
      role: "admin",
    },
    create: {
      accountId: account.id,
      username: "flatburger",
      passwordHash,
      role: "admin",
    },
  });

  await prisma.settings.upsert({
    where: { accountId: account.id },
    update: {
      accountId: account.id,
      startingBalance: new Decimal("15000.00"),
      defaultPdvPercent: new Decimal("20.00"),
      deliveryFeePercent: new Decimal("25.00"),
      currency: "RSD",
    },
    create: {
      accountId: account.id,
      startingBalance: new Decimal("15000.00"),
      defaultPdvPercent: new Decimal("20.00"),
      deliveryFeePercent: new Decimal("25.00"),
      currency: "RSD",
    },
  });

  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.supplier.deleteMany();

  const suppliers = await prisma.$transaction([
    prisma.supplier.create({
      data: { accountId: account.id, number: 1, name: "Meso", category: "MEAT", pdvPercent: new Decimal("10") },
    }),
    prisma.supplier.create({
      data: { accountId: account.id, number: 2, name: "Peciva", category: "PACKAGING", pdvPercent: null },
    }),
    prisma.supplier.create({
      data: { accountId: account.id, number: 3, name: "Piće", category: "OTHER", pdvPercent: new Decimal("20") },
    }),
  ]);

  const incomes = [
    {
      date: dateOnly(6),
      amount: new Decimal("42000.00"),
      accountId: account.id,
      channel: IncomeChannel.LOCAL,
      feePercentApplied: new Decimal("0"),
      feeAmount: new Decimal("0"),
      netAmount: new Decimal("42000.00"),
      note: "Ručak u lokalu",
    },
    {
      date: dateOnly(6),
      amount: new Decimal("18000.00"),
      accountId: account.id,
      channel: IncomeChannel.DELIVERY,
      feePercentApplied: new Decimal("25"),
      feeAmount: new Decimal("4500.00"),
      netAmount: new Decimal("13500.00"),
      note: "Dostava - platforma A",
    },
    {
      date: dateOnly(5),
      amount: new Decimal("38000.00"),
      accountId: account.id,
      channel: IncomeChannel.LOCAL,
      feePercentApplied: new Decimal("0"),
      feeAmount: new Decimal("0"),
      netAmount: new Decimal("38000.00"),
      note: "Večera u lokalu",
    },
    {
      date: dateOnly(5),
      amount: new Decimal("22000.00"),
      accountId: account.id,
      channel: IncomeChannel.DELIVERY,
      feePercentApplied: new Decimal("22"),
      feeAmount: new Decimal("4840.00"),
      netAmount: new Decimal("17160.00"),
      note: "Dostava - platforma B",
    },
    {
      date: dateOnly(4),
      amount: new Decimal("45000.00"),
      accountId: account.id,
      channel: IncomeChannel.LOCAL,
      feePercentApplied: new Decimal("0"),
      feeAmount: new Decimal("0"),
      netAmount: new Decimal("45000.00"),
      note: "Specijalni meni",
    },
    {
      date: dateOnly(3),
      amount: new Decimal("26000.00"),
      accountId: account.id,
      channel: IncomeChannel.DELIVERY,
      feePercentApplied: new Decimal("25"),
      feeAmount: new Decimal("6500.00"),
      netAmount: new Decimal("19500.00"),
      note: "Dostava - vikend",
    },
    {
      date: dateOnly(2),
      amount: new Decimal("41000.00"),
      accountId: account.id,
      channel: IncomeChannel.LOCAL,
      feePercentApplied: new Decimal("0"),
      feeAmount: new Decimal("0"),
      netAmount: new Decimal("41000.00"),
      note: "Korporativni ručak",
    },
    {
      date: dateOnly(1),
      amount: new Decimal("19500.00"),
      accountId: account.id,
      channel: IncomeChannel.DELIVERY,
      feePercentApplied: new Decimal("24"),
      feeAmount: new Decimal("4680.00"),
      netAmount: new Decimal("14820.00"),
      note: "Dostava - platforma A",
    },
    {
      date: dateOnly(0),
      amount: new Decimal("47000.00"),
      accountId: account.id,
      channel: IncomeChannel.LOCAL,
      feePercentApplied: new Decimal("0"),
      feeAmount: new Decimal("0"),
      netAmount: new Decimal("47000.00"),
      note: "Današnji promet",
    },
  ];

  const expenses = [
    {
      date: dateOnly(6),
      accountId: account.id,
      supplierId: suppliers[0].id,
      grossAmount: new Decimal("12000.00"),
      netAmount: new Decimal("10909.09"),
      pdvPercent: new Decimal("10"),
      pdvAmount: new Decimal("1090.91"),
      type: ExpenseType.SUPPLIER,
      note: "Sirovo meso",
      paidNow: false,
    },
    {
      date: dateOnly(6),
      accountId: account.id,
      supplierId: suppliers[1].id,
      grossAmount: new Decimal("3400.00"),
      netAmount: new Decimal("2833.33"),
      pdvPercent: new Decimal("20"),
      pdvAmount: new Decimal("566.67"),
      type: ExpenseType.SUPPLIER,
      note: "Peciva za sendviče",
      paidNow: true,
    },
    {
      date: dateOnly(5),
      accountId: account.id,
      supplierId: suppliers[2].id,
      grossAmount: new Decimal("5200.00"),
      netAmount: new Decimal("4333.33"),
      pdvPercent: new Decimal("20"),
      pdvAmount: new Decimal("866.67"),
      type: ExpenseType.SUPPLIER,
      note: "Sokovi i voda",
      paidNow: false,
    },
    {
      date: dateOnly(4),
      accountId: account.id,
      supplierId: suppliers[1].id,
      grossAmount: new Decimal("4600.00"),
      netAmount: new Decimal("3833.33"),
      pdvPercent: new Decimal("20"),
      pdvAmount: new Decimal("766.67"),
      type: ExpenseType.SUPPLIER,
      note: "Hleb i peciva",
      paidNow: false,
    },
    {
      date: dateOnly(3),
      accountId: account.id,
      supplierId: suppliers[0].id,
      grossAmount: new Decimal("9800.00"),
      netAmount: new Decimal("8909.09"),
      pdvPercent: new Decimal("10"),
      pdvAmount: new Decimal("890.91"),
      type: ExpenseType.SUPPLIER,
      note: "Piletina",
      paidNow: false,
    },
    {
      date: dateOnly(2),
      accountId: account.id,
      supplierId: suppliers[2].id,
      grossAmount: new Decimal("3100.00"),
      netAmount: new Decimal("2583.33"),
      pdvPercent: new Decimal("20"),
      pdvAmount: new Decimal("516.67"),
      type: ExpenseType.SUPPLIER,
      note: "Sokovi - gotovina",
      paidNow: true,
    },
    {
      date: dateOnly(1),
      accountId: account.id,
      supplierId: suppliers[0].id,
      grossAmount: new Decimal("11500.00"),
      netAmount: new Decimal("10454.55"),
      pdvPercent: new Decimal("10"),
      pdvAmount: new Decimal("1045.45"),
      type: ExpenseType.SUPPLIER,
      note: "Riba",
      paidNow: false,
    },
    {
      date: dateOnly(1),
      accountId: account.id,
      grossAmount: new Decimal("60000.00"),
      netAmount: new Decimal("60000.00"),
      pdvPercent: new Decimal("0"),
      pdvAmount: new Decimal("0"),
      type: ExpenseType.SALARY,
      note: "Isplata plata",
      paidNow: false,
    },
    {
      date: dateOnly(0),
      accountId: account.id,
      supplierId: suppliers[0].id,
      grossAmount: new Decimal("15000.00"),
      netAmount: new Decimal("15000.00"),
      pdvPercent: new Decimal("0"),
      pdvAmount: new Decimal("0"),
      type: ExpenseType.SUPPLIER_PAYMENT,
      note: "Uplata dobavljaču (zatvaranje duga)",
      paidNow: true,
    },
  ];

  await prisma.income.createMany({ data: incomes });
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
