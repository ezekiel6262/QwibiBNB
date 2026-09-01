import { DEMO_ORDERS, type OrderRow } from "./demo-data";

export type EngineResult = {
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  truncated: boolean;
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const DIMENSIONS: { key: keyof OrderRow; labels: string[] }[] = [
  { key: "region", labels: ["region", "regions"] },
  { key: "category", labels: ["category", "categories"] },
  { key: "product", labels: ["product", "products"] },
  { key: "status", labels: ["status", "statuses"] },
  { key: "customer", labels: ["customer", "customers"] },
];

function lineTotal(row: OrderRow): number {
  return row.quantity * row.unitPrice;
}

function extractTopN(question: string): number | null {
  const digitMatch = question.match(/top\s+(\d+)/i);
  if (digitMatch) return Number(digitMatch[1]);
  const wordMatch = question.match(/top\s+(\w+)/i);
  if (wordMatch && WORD_NUMBERS[wordMatch[1].toLowerCase()]) {
    return WORD_NUMBERS[wordMatch[1].toLowerCase()];
  }
  return null;
}

function applyFilters(question: string, rows: OrderRow[]): { rows: OrderRow[]; whereClauses: string[] } {
  const q = question.toLowerCase();
  let filtered = rows;
  const whereClauses: string[] = [];

  const regions = Array.from(new Set(rows.map((r) => r.region)));
  const matchedRegion = regions.find((r) => q.includes(r.toLowerCase()));
  if (matchedRegion) {
    filtered = filtered.filter((r) => r.region === matchedRegion);
    whereClauses.push(`region = '${matchedRegion}'`);
  }

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const matchedCategory = categories.find((c) => q.includes(c.toLowerCase()));
  if (matchedCategory) {
    filtered = filtered.filter((r) => r.category === matchedCategory);
    whereClauses.push(`category = '${matchedCategory}'`);
  }

  const statuses: OrderRow["status"][] = ["completed", "refunded", "pending"];
  const matchedStatus = statuses.find((s) => q.includes(s));
  if (matchedStatus) {
    filtered = filtered.filter((r) => r.status === matchedStatus);
    whereClauses.push(`status = '${matchedStatus}'`);
  }

  const yearMatch = q.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    filtered = filtered.filter((r) => r.orderDate.startsWith(yearMatch[1]));
    whereClauses.push(`order_date between '${yearMatch[1]}-01-01' and '${yearMatch[1]}-12-31'`);
  }

  return { rows: filtered, whereClauses };
}

function detectDimension(question: string): (typeof DIMENSIONS)[number] | null {
  const q = question.toLowerCase();
  return (
    DIMENSIONS.find((d) => d.labels.some((l) => q.includes(`by ${l}`) || q.includes(`${l} by`))) ??
    null
  );
}

function detectMeasure(question: string): { label: string; sqlExpr: string; compute: (rows: OrderRow[]) => number } {
  const q = question.toLowerCase();
  if (q.includes("average") || q.includes("aov") || q.includes("mean")) {
    return {
      label: "avg_order_value",
      sqlExpr: "avg(quantity * unit_price)",
      compute: (rows) => (rows.length === 0 ? 0 : rows.reduce((s, r) => s + lineTotal(r), 0) / rows.length),
    };
  }
  if (q.includes("count") || q.includes("how many") || q.includes("number of orders")) {
    return { label: "order_count", sqlExpr: "count(*)", compute: (rows) => rows.length };
  }
  if (q.includes("units") || q.includes("quantity") || q.includes("items sold")) {
    return {
      label: "total_units",
      sqlExpr: "sum(quantity)",
      compute: (rows) => rows.reduce((s, r) => s + r.quantity, 0),
    };
  }
  return {
    label: "total_revenue",
    sqlExpr: "sum(quantity * unit_price)",
    compute: (rows) => rows.reduce((s, r) => s + lineTotal(r), 0),
  };
}

export function answerFromDemoData(question: string): EngineResult {
  const { rows: filtered, whereClauses } = applyFilters(question, DEMO_ORDERS);
  const dimension = detectDimension(question);
  const measure = detectMeasure(question);
  const topN = extractTopN(question);
  const wantsLowest = /lowest|worst|bottom|least/i.test(question);
  const whereSql = whereClauses.length > 0 ? `\nwhere ${whereClauses.join(" and ")}` : "";

  if (!dimension) {
    const value = measure.compute(filtered);
    const rounded = Math.round(value * 100) / 100;
    return {
      sql: `select ${measure.sqlExpr} as ${measure.label}\nfrom orders${whereSql};`,
      columns: [measure.label],
      rows: [{ [measure.label]: rounded }],
      totalRows: 1,
      truncated: false,
    };
  }

  const groups = new Map<string, OrderRow[]>();
  for (const row of filtered) {
    const key = String(row[dimension.key]);
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  let results = Array.from(groups.entries()).map(([key, rows]) => ({
    [dimension.key]: key,
    [measure.label]: Math.round(measure.compute(rows) * 100) / 100,
  }));

  results.sort((a, b) => {
    const av = Number(a[measure.label]);
    const bv = Number(b[measure.label]);
    return wantsLowest ? av - bv : bv - av;
  });

  const totalRows = results.length;
  const limit = topN ?? results.length;
  const truncated = limit < results.length;
  results = results.slice(0, limit);

  return {
    sql:
      `select ${dimension.key}, ${measure.sqlExpr} as ${measure.label}\n` +
      `from orders${whereSql}\n` +
      `group by ${dimension.key}\n` +
      `order by ${measure.label} ${wantsLowest ? "asc" : "desc"}` +
      (topN ? `\nlimit ${topN};` : ";"),
    columns: [dimension.key, measure.label],
    rows: results,
    totalRows,
    truncated,
  };
}
