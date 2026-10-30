// Dates are plain "YYYY-MM-DD" strings in Dhaka local time. Bangladesh is UTC+6 with no DST,
// so nothing here depends on the timezone of the server.

const DHAKA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today in Dhaka as "YYYY-MM-DD". */
export function today(at: Date = new Date()): string {
  const parts = DHAKA.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export const currentYear = () => Number(today().slice(0, 4));

/** Age in whole years from a birth year, as the ghotok would say it. */
export const ageFromYear = (birthYear: number) => currentYear() - birthYear;

const toDate = (value: string | Date) => (typeof value === "string" ? new Date(`${value}T00:00:00+06:00`) : value);

/** "YYYY-MM-DD" (or a Date) shown as a short Bangla date: ৩০ অক্টোবর ২০২৬ */
export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" }).format(toDate(value));
}

/** A moment shown with its time: ৩০ অক্টোবর, বিকাল ৫:১০ */
export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("bn-BD", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(value);
}
