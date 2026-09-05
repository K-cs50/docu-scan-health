// Browser-safe shared constants & helpers (no server imports).

export const DOC_STATUS = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  READY: "READY",
  FAILED: "FAILED",
  REVIEW_REQUIRED: "REVIEW REQUIRED",
} as const;

export const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export const NOT_IN_SOURCE = "Not available in source.";

export function fmtDate(value?: string | null): string {
  if (!value) return NOT_IN_SOURCE;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value: string): string {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Deterministic numeric parse used by the comparison engine (no AI involved). */
export function parseNumeric(value?: string | null): number | null {
  if (!value) return null;
  const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export type LabRow = {
  label: string;
  value: string | null;
  unit: string | null;
  reference_range: string | null;
};

export type DiffRow = {
  label: string;
  previous: string;
  current: string;
  delta: string | null;
  unit: string | null;
  changed: boolean;
};

/** Pure application code — compares two sets of lab values. Provenance: CALCULATED. */
export function compareLabs(previous: LabRow[], current: LabRow[]): DiffRow[] {
  const key = (s: string) => s.trim().toLowerCase();
  const prevMap = new Map(previous.map((r) => [key(r.label), r]));
  const rows: DiffRow[] = [];

  for (const cur of current) {
    const prev = prevMap.get(key(cur.label));
    if (!prev) continue;
    const a = parseNumeric(prev.value);
    const b = parseNumeric(cur.value);
    let delta: string | null = null;
    if (a !== null && b !== null) {
      const d = Math.round((b - a) * 1000) / 1000;
      delta = `${d > 0 ? "+" : ""}${d}`;
    }
    const changed = (prev.value ?? "") !== (cur.value ?? "");
    rows.push({
      label: cur.label,
      previous: prev.value ?? NOT_IN_SOURCE,
      current: cur.value ?? NOT_IN_SOURCE,
      delta,
      unit: cur.unit ?? prev.unit ?? null,
      changed,
    });
  }
  return rows.sort((x, y) => x.label.localeCompare(y.label));
}
