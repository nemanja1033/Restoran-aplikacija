import { Prisma } from "@prisma/client";

export function decimalFromString(value: string) {
  return new Prisma.Decimal(value.replace(",", "."));
}
