import ExcelJS from "exceljs";
import {
  parseDataset,
  computeNumericStats,
  computeCategoricalStats,
  computeCorrelations,
  type ParsedDataset,
  type NumericStats,
  type CategoricalStats,
  type CorrelationPair,
} from "@/lib/services/s3-data-analysis-run/stats";
import { parseSeries, computeForecast, type ForecastResult } from "@/lib/services/s4-ml-forecasts/forecast";

export type AnalysisBundle = {
  dataset: ParsedDataset;
  numericStats: NumericStats[];
  categoricalStats: CategoricalStats[];
  correlations: CorrelationPair[];
  forecast: ForecastResult | null;
};

export function runAnalysis(csvData: string, targetColumn: string | undefined, horizon: number): AnalysisBundle {
  const dataset = parseDataset(csvData);
  const numericStats = dataset.columns.filter((c) => c.type === "numeric").map(computeNumericStats);
  const categoricalStats = dataset.columns
    .filter((c) => c.type === "categorical")
    .map(computeCategoricalStats);
  const correlations = computeCorrelations(dataset.columns.filter((c) => c.type === "numeric"));

  let forecast: ForecastResult | null = null;
  if (targetColumn) {
    const series = parseSeries(csvData, targetColumn);
    forecast = computeForecast(series, horizon);
  }

  return { dataset, numericStats, categoricalStats, correlations, forecast };
}

export function describeAnalysisFigures(bundle: AnalysisBundle): string {
  const parts: string[] = [
    `Dataset: ${bundle.dataset.rowCount} rows, ${bundle.dataset.columns.length} columns.`,
  ];
  for (const s of bundle.numericStats) {
    parts.push(
      `${s.column}: mean ${s.mean.toFixed(2)}, std ${s.std.toFixed(2)}, range ${s.min.toFixed(2)} to ${s.max.toFixed(2)}, ${s.outlierCount} outliers.`
    );
  }
  const topCorrelation = bundle.correlations[0];
  if (topCorrelation && Math.abs(topCorrelation.r) >= 0.3) {
    parts.push(
      `Strongest correlation: ${topCorrelation.columnA} and ${topCorrelation.columnB} at r=${topCorrelation.r.toFixed(2)}.`
    );
  }
  if (bundle.forecast) {
    parts.push(
      `Forecast model: ${bundle.forecast.model}, validation MAE ${bundle.forecast.metrics.mae.toFixed(2)}, RMSE ${bundle.forecast.metrics.rmse.toFixed(2)}.`
    );
  }
  return parts.join(" ");
}

export async function buildAnalysisAppendix(bundle: AnalysisBundle): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const stats = workbook.addWorksheet("Numeric Stats");
  const statsHeaders = ["Column", "Count", "Mean", "Std", "Min", "Max", "Outliers"];
  statsHeaders.forEach((h, i) => {
    const cell = stats.getCell(1, i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: "FF9CA3AF" } };
  });
  bundle.numericStats.forEach((s, i) => {
    const r = i + 2;
    [s.column, s.count, Math.round(s.mean * 100) / 100, Math.round(s.std * 100) / 100, s.min, s.max, s.outlierCount].forEach(
      (v, ci) => {
        stats.getCell(r, ci + 1).value = v;
      }
    );
  });
  stats.columns.forEach((c) => (c.width = 16));

  if (bundle.forecast) {
    const fc = workbook.addWorksheet("Forecast");
    fc.getCell(1, 1).value = "Model";
    fc.getCell(1, 2).value = bundle.forecast.model;
    fc.getCell(2, 1).value = "Validation MAE";
    fc.getCell(2, 2).value = Math.round(bundle.forecast.metrics.mae * 100) / 100;
    fc.getCell(3, 1).value = "Validation RMSE";
    fc.getCell(3, 2).value = Math.round(bundle.forecast.metrics.rmse * 100) / 100;
    fc.getCell(4, 1).value = "Limitations";
    fc.getCell(4, 2).value = bundle.forecast.limitations;

    const headerRow = 6;
    ["Period", "Actual", "Predicted", "Split"].forEach((h, i) => {
      const cell = fc.getCell(headerRow, i + 1);
      cell.value = h;
      cell.font = { size: 9, bold: true, color: { argb: "FF9CA3AF" } };
    });
    bundle.forecast.rows.forEach((row, i) => {
      const r = headerRow + 1 + i;
      fc.getCell(r, 1).value = row.period;
      fc.getCell(r, 2).value = row.actual;
      fc.getCell(r, 3).value = Math.round(row.predicted * 100) / 100;
      fc.getCell(r, 4).value = row.split;
    });
    fc.columns.forEach((c) => (c.width = 18));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
