import { Decimal } from "@prisma/client/runtime/client";

export function decimalFromString(value: string) {
  return new Decimal(value.replace(",", "."));
}
