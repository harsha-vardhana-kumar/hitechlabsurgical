import { environment } from "../config/environment";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: environment.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export const formatDate = (v: string) =>
  v
    ? new Intl.DateTimeFormat(environment.locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${v.slice(0, 10)}T12:00:00Z`))
    : "—";
export const money = (paise: number) =>
  new Intl.NumberFormat(environment.locale, {
    style: "currency",
    currency: environment.currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);
export function financialYear(date: string, startMonth: number) {
  if (
    !validDate(date) ||
    !Number.isInteger(startMonth) ||
    startMonth < 1 ||
    startMonth > 12
  )
    throw new Error("Invalid financial year configuration.");
  const year =
    Number(date.slice(0, 4)) - (Number(date.slice(5, 7)) < startMonth ? 1 : 0);
  return `${year}-${String(year + 1).slice(-2)}`;
}
export type DateRange =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "financial-year"
  | "custom"
  | "all";
export function dateRange(
  range: DateRange,
  date: string,
  startMonth: number,
): [string, string] {
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7)),
    first = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}-01`;
  if (range === "today") return [date, date];
  if (range === "week") {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    return [addDays(date, -((day + 6) % 7)), date];
  }
  if (range === "month") return [first(year, month), date];
  if (range === "quarter")
    return [first(year, Math.floor((month - 1) / 3) * 3 + 1), date];
  if (range === "financial-year")
    return [first(year - (month < startMonth ? 1 : 0), startMonth), date];
  return ["", ""];
}
