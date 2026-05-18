// Centralized date helpers — French (dd/MM/yyyy) display, ISO (YYYY-MM-DD) storage.
// Keep all date formatting/parsing consistent across the app.

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Parse a date input from various shapes without timezone drift.
 * Accepts: Date | ISO "YYYY-MM-DD" | ISO timestamp | French "dd/MM/yyyy".
 * Returns a Date at local midnight, or null if invalid.
 */
export function parseAnyDate(input?: string | Date | null): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const s = String(input).trim();
  if (!s) return null;

  // dd/MM/yyyy
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (fr) {
    const [, d, m, y] = fr;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return isNaN(dt.getTime()) ? null : dt;
  }

  // YYYY-MM-DD (parse as local to avoid UTC day-shift)
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  // Full ISO timestamp or any other parseable form
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Format any date input as French dd/MM/yyyy. Returns "—" when empty/invalid. */
export function formatDateFR(input?: string | Date | null): string {
  const d = parseAnyDate(input);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Parse a French dd/MM/yyyy string into a Date (local midnight) or null. */
export function parseFrenchDate(s?: string | null): Date | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const dt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return isNaN(dt.getTime()) ? null : dt;
}

/** Convert any supported input to ISO YYYY-MM-DD (for Supabase). */
export function toISODate(input?: string | Date | null): string {
  const d = parseAnyDate(input);
  if (!d) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Validate a French dd/MM/yyyy string. */
export function isValidFrenchDate(s?: string | null): boolean {
  return parseFrenchDate(s ?? "") !== null;
}

/** Long French format (e.g. "18 mai 2026"). */
export function formatDateLongFR(input?: string | Date | null): string {
  const d = parseAnyDate(input);
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}
