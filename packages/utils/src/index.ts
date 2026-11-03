export function uniqueId(prefix = "id") {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}
export function csvCell(value: unknown) {
  const s = String(value ?? "");
  return `"${(/^[\s]*[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
}
export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}
export function humanDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}
