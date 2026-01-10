import { format, parseISO } from "date-fns";

export function formatCurrency(value: number, currency = "RSD") {
  return new Intl.NumberFormat("sr-RS", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string | Date) {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "dd.MM.yyyy");
}

export function parseDateString(value: string) {
  return parseISO(value + "T12:00:00");
}

export function toNumber(value: string) {
  return Number(value.replace(",", "."));
}
