import ExcelJS from "exceljs";
import type { ForecastResult } from "./forecast";

const ACCENT = "FF1D4ED8";
const MUTED = "FF9CA3AF";
const INK = "FF0D1117";
const BODY = "FF374151";
const GREEN = "FF15803D";

const SPLIT_LABEL: Record<ForecastResult["rows"][number]["split"], string> = {
  train: "Train",
  validation: "Validation",
  forecast: "Forecast",
};

export async function buildForecastWorkbook(args: {
  title: string;
  targetColumn: string;
  result: ForecastResult;
  narrative: string;
  jobId: string;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const predictions = workbook.addWorksheet("Predictions");
  predictions.getCell("A1").value = args.title;
  predictions.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  predictions.getCell("A2").value = `Forecasting "${args.targetColumn}"`;
  predictions.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  const headerRow = 4;
  ["Period", "Actual", "Predicted", "Split"].forEach((h, i) => {
    const cell = predictions.getCell(headerRow, i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: MUTED } };
  });
  predictions.columns.forEach((col) => (col.width = 16));

  args.result.rows.forEach((row, i) => {
    const r = headerRow + 1 + i;
    predictions.getCell(r, 1).value = row.period;
    predictions.getCell(r, 2).value = row.actual;
    predictions.getCell(r, 2).numFmt = "#,##0.0";
    predictions.getCell(r, 3).value = Math.round(row.predicted * 100) / 100;
    predictions.getCell(r, 3).numFmt = "#,##0.0";
    if (row.split === "forecast") {
      predictions.getCell(r, 3).font = { bold: true, color: { argb: ACCENT } };
    }
    predictions.getCell(r, 4).value = SPLIT_LABEL[row.split];
    predictions.getCell(r, 4).font = { size: 9, color: { argb: MUTED } };
  });

  const card = workbook.addWorksheet("Model Card");
  card.getColumn("A").width = 28;
  card.getColumn("B").width = 40;

  card.getCell("A1").value = args.title;
  card.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  card.getCell("A2").value = "Plain-English model card - QWIBI";
  card.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  card.getCell("A4").value = "Model selected";
  card.getCell("A4").font = { size: 9, color: { argb: MUTED } };
  card.getCell("B4").value = args.result.model;
  card.getCell("B4").font = { size: 13, bold: true, color: { argb: ACCENT } };

  const metricRows: [string, number, string][] = [
    ["MAE (mean absolute error)", args.result.metrics.mae, "#,##0.00"],
    ["RMSE (root mean squared error)", args.result.metrics.rmse, "#,##0.00"],
    ["MAPE (mean absolute % error)", args.result.metrics.mape, "0.0"],
  ];
  metricRows.forEach(([label, value, fmt], i) => {
    const r = 6 + i;
    card.getCell(`A${r}`).value = label;
    card.getCell(`A${r}`).font = { size: 9, color: { argb: MUTED } };
    card.getCell(`B${r}`).value = value;
    card.getCell(`B${r}`).numFmt = fmt;
    card.getCell(`B${r}`).font = { bold: true, color: { argb: GREEN } };
  });

  card.getCell("A10").value = "Limitations";
  card.getCell("A10").font = { size: 10, bold: true, color: { argb: INK } };
  card.mergeCells("A11:B14");
  card.getCell("A11").value = args.result.limitations;
  card.getCell("A11").font = { size: 9.5, color: { argb: BODY } };
  card.getCell("A11").alignment = { wrapText: true, vertical: "top" };

  card.getCell("A16").value = "Executive summary";
  card.getCell("A16").font = { size: 10, bold: true, color: { argb: INK } };
  card.mergeCells("A17:B21");
  card.getCell("A17").value = args.narrative;
  card.getCell("A17").font = { size: 9.5, color: { argb: BODY } };
  card.getCell("A17").alignment = { wrapText: true, vertical: "top" };

  card.getCell("A23").value = `Prepared ${new Date().toISOString()}`;
  card.getCell("A23").font = { size: 8, color: { argb: MUTED } };
  card.getCell("B23").value = `Verify at /verify/${args.jobId}`;
  card.getCell("B23").font = { size: 8, color: { argb: ACCENT } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
