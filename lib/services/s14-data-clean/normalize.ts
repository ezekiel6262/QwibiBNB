const MISSING_TOKENS = new Set(["", "na", "n/a", "null", "none", "-", "--", "?", "unknown"]);

export function isMissingToken(value: string): boolean {
  return MISSING_TOKENS.has(value.trim().toLowerCase());
}

export function normalizeHeader(header: string, index: number): string {
  const slug = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || `column_${index + 1}`;
}

export function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((h) => {
    const count = seen.get(h) ?? 0;
    seen.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });
}

/**
 * Tries ISO and common written formats via Date.parse first (handles "2026-01-05",
 * "Jan 5, 2026", full ISO timestamps). Falls back to explicit numeric slash/dash parsing
 * for ambiguous ordering: defaults to MM/DD/YYYY (most common in CSV exports from
 * US-based tools) unless the first number exceeds 12, in which case DD/MM/YYYY is the only
 * valid reading. This is a genuine best-effort, not a guaranteed-correct disambiguation -
 * genuinely ambiguous dates (e.g. 03/04/2026) cannot be resolved without format metadata
 * the CSV doesn't carry.
 */
export function tryParseDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Strict ISO date (optionally with time/zone) is already unambiguous - extract directly
  // rather than round-tripping through Date, which would apply UTC-vs-local conversion.
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const month = Number(m);
    const day = Number(d);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return `${y}-${m}-${d}`;
    return null;
  }

  // Explicit numeric D/M/Y or M/D/Y (year last) - built as a plain string so the result
  // never depends on engine or server timezone, unlike Date.parse's native fallback for
  // this exact shape, which uses local-time semantics and can shift the date by a day.
  const numeric = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (numeric) {
    const [, a, b, year] = numeric;
    let month = Number(a);
    let day = Number(b);
    if (month > 12 && day <= 12) [month, day] = [day, month];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const fullYear = year.length === 2 ? Number(`20${year}`) : Number(year);
    return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Fallback: written formats like "Jan 8, 2026" - requires an actual letter (a month
  // name, weekday, or "GMT"/"Z") so a bare number like "3520" is never treated as a year;
  // Date.parse would otherwise happily accept it as one. The engine parses these formats in
  // local time, so the result is read back with local getters to recover the intended
  // calendar date regardless of server timezone.
  if (/[a-zA-Z]/.test(trimmed)) {
    const parsedMs = Date.parse(trimmed);
    if (!Number.isNaN(parsedMs)) {
      const d = new Date(parsedMs);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }

  return null;
}

export function tryParseNumber(value: string): number | null {
  let trimmed = value.trim();
  if (!trimmed) return null;

  let negative = false;
  const accounting = trimmed.match(/^\(([^)]+)\)$/);
  if (accounting) {
    negative = true;
    trimmed = accounting[1];
  }

  trimmed = trimmed.replace(/^[$€£¥]\s*/, "").replace(/\s*[$€£¥]$/, "");
  if (!/^-?[\d,]+(\.\d+)?%?$/.test(trimmed)) return null;

  const isPercent = trimmed.endsWith("%");
  if (isPercent) trimmed = trimmed.slice(0, -1);

  const withoutCommas = trimmed.replace(/,/g, "");
  const parsed = Number(withoutCommas);
  if (Number.isNaN(parsed)) return null;

  const signed = negative ? -Math.abs(parsed) : parsed;
  return isPercent ? signed / 100 : signed;
}

const MOJIBAKE_PATTERNS = [/Ã./g, /Â./g, /â€™/g, /â€œ/g, /â€/g, /â€"/g];

export function hasEncodingArtifact(value: string): boolean {
  return MOJIBAKE_PATTERNS.some((p) => p.test(value));
}

/**
 * Reverses the most common mojibake pattern: UTF-8 bytes misread as Latin-1 and
 * re-encoded. Deterministic and reversible, not a guess - only applied when the result is
 * clean (no replacement characters) and different from the input.
 */
export function tryFixMojibake(value: string): string | null {
  if (!hasEncodingArtifact(value)) return null;
  try {
    const fixed = Buffer.from(value, "latin1").toString("utf8");
    if (fixed !== value && !fixed.includes("�")) return fixed;
  } catch {
    return null;
  }
  return null;
}
