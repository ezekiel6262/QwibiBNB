import ExcelJS from "exceljs";
import type { ParsedDataset, NumericStats, CategoricalStats, CorrelationPair } from "./stats";

const ACCENT = "FF1D4ED8";
const MUTED = "FF9CA3AF";
const INK = "FF0D1117";
const BODY = "FF374151";
const AMBER = "FFB45309";

function headerRow(sheet: ExcelJS.Worksheet, row: number, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: MUTED } };
  });
}

export async function buildAnalysisWorkbook(args: {
  title: string;
  dataset: ParsedDataset;
  numericStats: NumericStats[];
  categoricalStats: CategoricalStats[];
  correlations: CorrelationPair[];
  narrative: string;
  jobId: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const overview = workbook.addWorksheet("Overview");
  overview.getColumn("A").width = 24;
  overview.getColumn("B").width = 50;
  overview.getCell("A1").value = args.title;
  overview.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  overview.getCell("A2").value = "Exploratory data analysis - QWIBI";
  overview.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  overview.getCell("A4").value = "Rows";
  overview.getCell("A4").font = { size: 9, color: { argb: MUTED } };
  overview.getCell("B4").value = args.dataset.rowCount;
  overview.getCell("B4").font = { bold: true, color: { argb: ACCENT } };
  overview.getCell("A5").value = "Columns";
  overview.getCell("A5").font = { size: 9, color: { argb: MUTED } };
  overview.getCell("B5").value = args.dataset.columns.length;
  overview.getCell("B5").font = { bold: true, color: { argb: ACCENT } };

  headerRow(overview, 7, ["Column", "Type", "Missing"]);
  args.dataset.columns.forEach((col, i) => {
    const r = 8 + i;
    overview.getCell(r, 1).value = col.name;
    overview.getCell(r, 2).value = col.type;
    overview.getCell(r, 2).font = { size: 9, color: { argb: MUTED } };
    overview.getCell(r, 3).value = col.values.filter((v) => v === null).length;
  });

  const summaryRow = 9 + args.dataset.columns.length;
  overview.getCell(summaryRow, 1).value = "Executive summary";
  overview.getCell(summaryRow, 1).font = { size: 10, bold: true, color: { argb: INK } };
  overview.mergeCells(`A${summaryRow + 1}:C${summaryRow + 5}`);
  overview.getCell(summaryRow + 1, 1).value = args.narrative;
  overview.getCell(summaryRow + 1, 1).font = { size: 9.5, color: { argb: BODY } };
  overview.getCell(summaryRow + 1, 1).alignment = { wrapText: true, vertical: "top" };

  overview.getCell(summaryRow + 7, 1).value = `Prepared ${new Date().toISOString()}`;
  overview.getCell(summaryRow + 7, 1).font = { size: 8, color: { argb: MUTED } };
  overview.getCell(summaryRow + 7, 3).value = `Verify at /verify/${args.jobId}`;
  overview.getCell(summaryRow + 7, 3).font = { size: 8, color: { argb: ACCENT } };

  const numeric = workbook.addWorksheet("Numeric Stats");
  headerRow(numeric, 1, ["Column", "Count", "Missing", "Mean", "Std", "Min", "Q1", "Median", "Q3", "Max", "Outliers"]);
  args.numericStats.forEach((s, i) => {
    const r = 2 + i;
    const values = [s.column, s.count, s.missing, s.mean, s.std, s.min, s.q1, s.median, s.q3, s.max, s.outlierCount];
    values.forEach((v, ci) => {
      const cell = numeric.getCell(r, ci + 1);
      cell.value = typeof v === "number" && ci > 2 && ci < 10 ? Math.round(v * 100) / 100 : v;
      if (ci === 10 && typeof v === "number" && v > 0) cell.font = { bold: true, color: { argb: AMBER } };
    });
  });
  numeric.columns.forEach((c) => (c.width = 14));

  const categorical = workbook.addWorksheet("Categorical Stats");
  headerRow(categorical, 1, ["Column", "Count", "Missing", "Unique", "Top values"]);
  args.categoricalStats.forEach((s, i) => {
    const r = 2 + i;
    categorical.getCell(r, 1).value = s.column;
    categorical.getCell(r, 2).value = s.count;
    categorical.getCell(r, 3).value = s.missing;
    categorical.getCell(r, 4).value = s.uniqueCount;
    categorical.getCell(r, 5).value = s.topValues.map((t) => `${t.value} (${t.count})`).join(", ");
  });
  categorical.columns.forEach((c) => (c.width = 20));

  const correlations = workbook.addWorksheet("Correlations");
  headerRow(correlations, 1, ["Column A", "Column B", "Pearson r"]);
  if (args.correlations.length === 0) {
    correlations.getCell(2, 1).value = "Fewer than two numeric columns - nothing to correlate.";
    correlations.getCell(2, 1).font = { size: 9, color: { argb: MUTED } };
  } else {
    args.correlations.forEach((c, i) => {
      const r = 2 + i;
      correlations.getCell(r, 1).value = c.columnA;
      correlations.getCell(r, 2).value = c.columnB;
      const rCell = correlations.getCell(r, 3);
      rCell.value = Math.round(c.r * 1000) / 1000;
      rCell.font = { bold: true, color: { argb: Math.abs(c.r) >= 0.5 ? ACCENT : MUTED } };
    });
  }
  correlations.columns.forEach((c) => (c.width = 18));

  const cleaned = workbook.addWorksheet("Cleaned Data");
  headerRow(
    cleaned,
    1,
    args.dataset.columns.map((c) => c.name)
  );
  for (let row = 0; row < args.dataset.rowCount; row++) {
    args.dataset.columns.forEach((col, ci) => {
      cleaned.getCell(row + 2, ci + 1).value = col.values[row];
    });
  }
  cleaned.columns.forEach((c) => (c.width = 16));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
