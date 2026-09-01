import Papa from "papaparse";

export type PriceSeries = {
  dates: string[];
  prices: number[];
  priceColumn: string;
  periodsPerYear: number;
};

function estimatePeriodsPerYear(dates: string[]): number {
  const parsed = dates.map((d) => new Date(d).getTime()).filter((t) => !Number.isNaN(t));
  if (parsed.length < 2) return 252;

  const gaps: number[] = [];
  for (let i = 1; i < parsed.length; i++) gaps.push(parsed[i] - parsed[i - 1]);
  gaps.sort((a, b) => a - b);
  const medianGapMs = gaps[Math.floor(gaps.length / 2)];
  const medianGapDays = medianGapMs / (1000 * 60 * 60 * 24);

  if (medianGapDays <= 1.5) return 252;
  if (medianGapDays <= 9) return 52;
  if (medianGapDays <= 45) return 12;
  return 4;
}

export function parsePriceSeries(csvText: string, priceColumn?: string): PriceSeries {
  const parsed = Papa.parse<Record<string, string>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(`could not parse CSV - ${parsed.errors[0].message} (row ${parsed.errors[0].row})`);
  }
  const rows = parsed.data;
  if (rows.length < 20) {
    throw new Error("need at least 20 rows of price history to run a backtest");
  }

  const columns = Object.keys(rows[0]);
  const dateColumn = columns[0];

  let column = priceColumn && columns.includes(priceColumn) ? priceColumn : undefined;
  if (!column) {
    column = columns
      .slice(1)
      .find((col) => rows.every((r) => r[col] !== undefined && r[col] !== "" && !Number.isNaN(Number(r[col]))));
  }
  if (!column) {
    throw new Error("no numeric price column found - check the CSV has a numeric column");
  }

  const prices = rows.map((r) => Number(r[column!]));
  if (prices.some((v) => Number.isNaN(v) || v <= 0)) {
    throw new Error(`column "${column}" has non-numeric or non-positive values in some rows`);
  }

  const dates = rows.map((r, i) => r[dateColumn] || String(i + 1));

  return { dates, prices, priceColumn: column, periodsPerYear: estimatePeriodsPerYear(dates) };
}
