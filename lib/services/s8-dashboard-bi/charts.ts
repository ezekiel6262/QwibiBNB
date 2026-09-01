import type { ParsedColumn, ParsedDataset } from "@/lib/services/s3-data-analysis-run/stats";

export type ChartSpec = {
  id: string;
  title: string;
  traces: Record<string, unknown>[];
  layout: Record<string, unknown>;
};

const MAX_HISTOGRAM_COLUMNS = 3;
const MAX_CATEGORIES = 15;
const HISTOGRAM_BINS = 8;

function histogramBins(values: number[], binCount: number): { labels: string[]; counts: number[] } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min) / binCount || 1;
  const counts = new Array(binCount).fill(0);
  for (const v of values) {
    const idx = Math.min(binCount - 1, Math.floor((v - min) / width));
    counts[idx]++;
  }
  const labels = counts.map((_, i) => {
    const lo = min + i * width;
    const hi = min + (i + 1) * width;
    return `${lo.toFixed(1)}-${hi.toFixed(1)}`;
  });
  return { labels, counts };
}

function isDateLike(col: ParsedColumn): boolean {
  if (col.type !== "categorical") return false;
  const values = col.values.filter((v): v is string => v !== null);
  if (values.length === 0) return false;
  const parsable = values.filter((v) => !Number.isNaN(Date.parse(v)));
  return parsable.length / values.length >= 0.9;
}

export function computeChartSpecs(dataset: ParsedDataset): ChartSpec[] {
  const specs: ChartSpec[] = [];
  const numericCols = dataset.columns.filter((c) => c.type === "numeric");
  const categoricalCols = dataset.columns.filter((c) => c.type === "categorical" && !isDateLike(c));
  const dateCol = dataset.columns.find(isDateLike);

  for (const col of numericCols.slice(0, MAX_HISTOGRAM_COLUMNS)) {
    const values = col.values.filter((v): v is number => v !== null);
    if (values.length < 3) continue;
    const { labels, counts } = histogramBins(values, HISTOGRAM_BINS);
    specs.push({
      id: `hist-${col.name}`,
      title: `Distribution of ${col.name}`,
      traces: [{ x: labels, y: counts, type: "bar", marker: { color: "#1d4ed8" } }],
      layout: { xaxis: { title: col.name }, yaxis: { title: "count" } },
    });
  }

  const bestCategory = categoricalCols
    .map((c) => ({ col: c, uniqueCount: new Set(c.values.filter((v) => v !== null)).size }))
    .filter((c) => c.uniqueCount >= 2 && c.uniqueCount <= MAX_CATEGORIES)
    .sort((a, b) => a.uniqueCount - b.uniqueCount)[0]?.col;

  if (bestCategory && numericCols.length > 0) {
    const groups = new Map<string, number[]>();
    for (let i = 0; i < dataset.rowCount; i++) {
      const key = String(bestCategory.values[i] ?? "unknown");
      groups.set(key, groups.get(key) ?? []);
    }
    const categories = Array.from(groups.keys()).sort();

    const traces = numericCols.slice(0, 2).map((numCol) => {
      const sums = categories.map((cat) => {
        let sum = 0;
        for (let i = 0; i < dataset.rowCount; i++) {
          if (String(bestCategory.values[i] ?? "unknown") === cat) {
            const v = numCol.values[i];
            if (typeof v === "number") sum += v;
          }
        }
        return Math.round(sum * 100) / 100;
      });
      return { x: categories, y: sums, type: "bar", name: numCol.name };
    });

    specs.push({
      id: `group-${bestCategory.name}`,
      title: `${numericCols.slice(0, 2).map((c) => c.name).join(" and ")} by ${bestCategory.name}`,
      traces,
      layout: { xaxis: { title: bestCategory.name }, yaxis: { title: "sum" }, barmode: "group" },
    });
  }

  if (dateCol && numericCols.length > 0) {
    const byDate = new Map<string, number>();
    const numCol = numericCols[0];
    for (let i = 0; i < dataset.rowCount; i++) {
      const dateValue = dateCol.values[i];
      const numValue = numCol.values[i];
      if (dateValue === null || typeof numValue !== "number") continue;
      const key = String(dateValue);
      byDate.set(key, (byDate.get(key) ?? 0) + numValue);
    }
    const sortedDates = Array.from(byDate.keys()).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    specs.push({
      id: `series-${dateCol.name}`,
      title: `${numCol.name} over ${dateCol.name}`,
      traces: [
        {
          x: sortedDates,
          y: sortedDates.map((d) => Math.round((byDate.get(d) ?? 0) * 100) / 100),
          type: "scatter",
          mode: "lines+markers",
          line: { color: "#1d4ed8" },
        },
      ],
      layout: { xaxis: { title: dateCol.name }, yaxis: { title: numCol.name } },
    });
  }

  return specs;
}
