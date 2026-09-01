import { isMissingToken, tryParseDate, tryParseNumber, tryFixMojibake, normalizeHeader } from "./normalize";
import type { SourceTable } from "./sources";

export type ColumnKind = "date" | "numeric" | "text";

export type ColumnInfo = { name: string; detectedType: ColumnKind };

export type RowFlag = { rowIndex: number; reasons: string[] };

export type QualityReport = {
  totalRowsIn: number;
  totalRowsOut: number;
  duplicatesRemoved: number;
  columns: ColumnInfo[];
  encodingFixesApplied: number;
  targetSchemaRequested: string[] | null;
  unmatchedTargetColumns: string[];
  flags: RowFlag[];
};

export type CleanedResult = { table: SourceTable; report: QualityReport };

const TYPE_DETECTION_THRESHOLD = 0.7;

function detectColumnType(values: string[]): ColumnKind {
  const nonEmpty = values.filter((v) => v.trim() !== "" && !isMissingToken(v));
  if (nonEmpty.length === 0) return "text";

  const dateHits = nonEmpty.filter((v) => tryParseDate(v) !== null).length;
  if (dateHits / nonEmpty.length >= TYPE_DETECTION_THRESHOLD) return "date";

  const numericHits = nonEmpty.filter((v) => tryParseNumber(v) !== null).length;
  if (numericHits / nonEmpty.length >= TYPE_DETECTION_THRESHOLD) return "numeric";

  return "text";
}

function matchTargetColumn(target: string, sourceColumns: string[]): string | null {
  const exact = sourceColumns.find((c) => c === target);
  if (exact) return exact;
  const substring = sourceColumns.find((c) => c.includes(target) || target.includes(c));
  return substring ?? null;
}

export function cleanTable(source: SourceTable, targetSchemaRaw: string | undefined): CleanedResult {
  const totalRowsIn = source.rows.length;
  const flags: RowFlag[] = [];
  let encodingFixesApplied = 0;

  const columnTypes = new Map<string, ColumnKind>();
  for (const col of source.columns) {
    const values = source.rows.map((r) => String(r[col] ?? ""));
    columnTypes.set(col, detectColumnType(values));
  }

  const cleanedRows = source.rows.map((row, rowIndex) => {
    const cleaned: Record<string, unknown> = {};
    const reasons: string[] = [];

    for (const col of source.columns) {
      const raw = row[col];
      const strValue = typeof raw === "number" ? String(raw) : String(raw ?? "");

      if (isMissingToken(strValue)) {
        cleaned[col] = null;
        continue;
      }

      const fixed = tryFixMojibake(strValue);
      const workingValue = fixed ?? strValue;
      if (fixed) encodingFixesApplied++;
      else if (fixed === null && /Ã.|Â.|â€/.test(strValue)) {
        reasons.push(`possible encoding issue in column "${col}"`);
      }

      const kind = columnTypes.get(col);
      if (kind === "date") {
        const parsed = tryParseDate(workingValue);
        if (parsed) {
          cleaned[col] = parsed;
        } else {
          cleaned[col] = workingValue;
          reasons.push(`unparseable date in column "${col}"`);
        }
      } else if (kind === "numeric") {
        const parsed = tryParseNumber(workingValue);
        if (parsed !== null) {
          cleaned[col] = parsed;
        } else {
          cleaned[col] = workingValue;
          reasons.push(`unparseable number in column "${col}"`);
        }
      } else {
        cleaned[col] = workingValue;
        if (kind === "text" && /[,|;]/.test(workingValue) && workingValue.split(/[,|;]/).length >= 3) {
          reasons.push(`possible merged column: "${col}" contains multiple delimited values`);
        }
      }
    }

    const sourceReasons = (source.sourceFlags ?? [])
      .filter((f) => f.rowIndex === rowIndex)
      .map((f) => f.reason);
    const allReasons = [...sourceReasons, ...reasons];
    if (allReasons.length > 0) flags.push({ rowIndex, reasons: allReasons });
    return cleaned;
  });

  const seen = new Set<string>();
  const deduped: Record<string, unknown>[] = [];
  let duplicatesRemoved = 0;
  for (const row of cleanedRows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      duplicatesRemoved++;
      continue;
    }
    seen.add(key);
    deduped.push(row);
  }

  let finalColumns = source.columns;
  let finalRows = deduped;
  let targetSchemaRequested: string[] | null = null;
  let unmatchedTargetColumns: string[] = [];

  if (targetSchemaRaw && targetSchemaRaw.trim()) {
    const targets = targetSchemaRaw
      .split(",")
      .map((t, i) => normalizeHeader(t, i))
      .filter(Boolean);
    targetSchemaRequested = targets;

    const mapping = new Map<string, string | null>();
    for (const target of targets) {
      mapping.set(target, matchTargetColumn(target, source.columns));
    }
    unmatchedTargetColumns = targets.filter((t) => mapping.get(t) === null);

    const extraColumns = source.columns.filter((c) => !Array.from(mapping.values()).includes(c));
    finalColumns = [...targets, ...extraColumns];

    finalRows = deduped.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const target of targets) {
        const sourceCol = mapping.get(target);
        mapped[target] = sourceCol ? row[sourceCol] : null;
      }
      for (const extra of extraColumns) mapped[extra] = row[extra];
      return mapped;
    });
  }

  const columns: ColumnInfo[] = source.columns.map((c) => ({
    name: c,
    detectedType: columnTypes.get(c) ?? "text",
  }));

  return {
    table: { columns: finalColumns, rows: finalRows },
    report: {
      totalRowsIn,
      totalRowsOut: finalRows.length,
      duplicatesRemoved,
      columns,
      encodingFixesApplied,
      targetSchemaRequested,
      unmatchedTargetColumns,
      flags,
    },
  };
}
