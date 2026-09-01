import Papa from "papaparse";

export type ColumnType = "numeric" | "categorical";

export type ParsedColumn = {
  name: string;
  type: ColumnType;
  values: (string | number | null)[];
};

export type ParsedDataset = {
  rowCount: number;
  columns: ParsedColumn[];
};

export type NumericStats = {
  column: string;
  count: number;
  missing: number;
  mean: number;
  std: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outlierCount: number;
};

export type CategoricalStats = {
  column: string;
  count: number;
  missing: number;
  uniqueCount: number;
  topValues: { value: string; count: number }[];
};

export type CorrelationPair = {
  columnA: string;
  columnB: string;
  r: number;
};

export function parseDataset(csvText: string): ParsedDataset {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`could not parse CSV - ${parsed.errors[0].message} (row ${parsed.errors[0].row})`);
  }
  const rows = parsed.data;
  if (rows.length < 3) {
    throw new Error("need at least 3 rows of data to analyze");
  }

  const columnNames = Object.keys(rows[0]);
  const columns: ParsedColumn[] = columnNames.map((name) => {
    const raw = rows.map((r) => (r[name] === "" || r[name] === undefined ? null : r[name]));
    const nonNull = raw.filter((v): v is string => v !== null);
    const isNumeric = nonNull.length > 0 && nonNull.every((v) => !Number.isNaN(Number(v)));
    return {
      name,
      type: isNumeric ? "numeric" : "categorical",
      values: isNumeric ? raw.map((v) => (v === null ? null : Number(v))) : raw,
    };
  });

  return { rowCount: rows.length, columns };
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function computeNumericStats(col: ParsedColumn): NumericStats {
  const values = (col.values.filter((v) => v !== null) as number[]).slice();
  const missing = col.values.length - values.length;
  const sorted = values.slice().sort((a, b) => a - b);
  const count = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / count;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / count;
  const std = Math.sqrt(variance);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outlierCount = values.filter((v) => v < lowerFence || v > upperFence).length;

  return {
    column: col.name,
    count,
    missing,
    mean,
    std,
    min: sorted[0],
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1],
    outlierCount,
  };
}

export function computeCategoricalStats(col: ParsedColumn): CategoricalStats {
  const values = col.values.filter((v) => v !== null) as string[];
  const missing = col.values.length - values.length;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const topValues = Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { column: col.name, count: values.length, missing, uniqueCount: counts.size, topValues };
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  const cov = a.reduce((s, v, i) => s + (v - meanA) * (b[i] - meanB), 0);
  const stdA = Math.sqrt(a.reduce((s, v) => s + (v - meanA) ** 2, 0));
  const stdB = Math.sqrt(b.reduce((s, v) => s + (v - meanB) ** 2, 0));
  if (stdA === 0 || stdB === 0) return 0;
  return cov / (stdA * stdB);
}

export function computeCorrelations(numericColumns: ParsedColumn[]): CorrelationPair[] {
  const pairs: CorrelationPair[] = [];
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = i + 1; j < numericColumns.length; j++) {
      const colA = numericColumns[i];
      const colB = numericColumns[j];
      const a: number[] = [];
      const b: number[] = [];
      for (let k = 0; k < colA.values.length; k++) {
        const va = colA.values[k];
        const vb = colB.values[k];
        if (va !== null && vb !== null) {
          a.push(va as number);
          b.push(vb as number);
        }
      }
      if (a.length >= 3) {
        pairs.push({ columnA: colA.name, columnB: colB.name, r: pearson(a, b) });
      }
    }
  }
  return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
}
