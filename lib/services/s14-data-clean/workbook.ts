import ExcelJS from "exceljs";
import type { SourceTable } from "./sources";
import type { QualityReport } from "./cleaning";

const MUTED = "FF9CA3AF";
const INK = "FF0D1117";
const ACCENT = "FF1D4ED8";
const AMBER = "FFB45309";

export async function buildCleanedWorkbook(args: {
  title: string;
  sourceType: string;
  table: SourceTable;
  report: QualityReport;
  jobId: string;
}): Promise<Buffer> {
  const { table, report } = args;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Data Quality Report");
  summary.getColumn("A").width = 28;
  summary.getColumn("B").width = 60;
  summary.getCell("A1").value = args.title;
  summary.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  summary.getCell("A2").value = `Data clean and structure - QWIBI - source: ${args.sourceType}`;
  summary.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  const stats: [string, string | number][] = [
    ["Rows in", report.totalRowsIn],
    ["Rows out", report.totalRowsOut],
    ["Duplicate rows removed", report.duplicatesRemoved],
    ["Rows flagged", report.flags.length],
    ["Encoding fixes applied", report.encodingFixesApplied],
    ["Target schema requested", report.targetSchemaRequested ? report.targetSchemaRequested.join(", ") : "none - used source schema"],
    ["Target columns not found in source", report.unmatchedTargetColumns.length > 0 ? report.unmatchedTargetColumns.join(", ") : "none"],
  ];
  stats.forEach(([label, value], i) => {
    const r = 4 + i;
    summary.getCell(r, 1).value = label;
    summary.getCell(r, 1).font = { size: 9.5, color: { argb: "FF374151" } };
    summary.getCell(r, 2).value = value;
    summary.getCell(r, 2).font = { bold: true, color: { argb: ACCENT } };
  });

  const columnsHeaderRow = 5 + stats.length;
  summary.getCell(columnsHeaderRow, 1).value = "Columns detected";
  summary.getCell(columnsHeaderRow, 1).font = { size: 10, bold: true, color: { argb: INK } };
  summary.getCell(columnsHeaderRow + 1, 1).value = "Column";
  summary.getCell(columnsHeaderRow + 1, 1).font = { size: 9, bold: true, color: { argb: MUTED } };
  summary.getCell(columnsHeaderRow + 1, 2).value = "Detected type";
  summary.getCell(columnsHeaderRow + 1, 2).font = { size: 9, bold: true, color: { argb: MUTED } };
  report.columns.forEach((c, i) => {
    const r = columnsHeaderRow + 2 + i;
    summary.getCell(r, 1).value = c.name;
    summary.getCell(r, 2).value = c.detectedType;
  });

  const flagsHeaderRow = columnsHeaderRow + 3 + report.columns.length;
  summary.getCell(flagsHeaderRow, 1).value = "Flagged rows";
  summary.getCell(flagsHeaderRow, 1).font = { size: 10, bold: true, color: { argb: INK } };
  if (report.flags.length === 0) {
    summary.getCell(flagsHeaderRow + 1, 1).value = "No rows were flagged.";
    summary.getCell(flagsHeaderRow + 1, 1).font = { size: 9, color: { argb: MUTED } };
  } else {
    summary.getCell(flagsHeaderRow + 1, 1).value = "Row";
    summary.getCell(flagsHeaderRow + 1, 1).font = { size: 9, bold: true, color: { argb: MUTED } };
    summary.getCell(flagsHeaderRow + 1, 2).value = "Reasons";
    summary.getCell(flagsHeaderRow + 1, 2).font = { size: 9, bold: true, color: { argb: MUTED } };
    report.flags.forEach((f, i) => {
      const r = flagsHeaderRow + 2 + i;
      summary.getCell(r, 1).value = f.rowIndex + 1;
      const reasonsCell = summary.getCell(r, 2);
      reasonsCell.value = f.reasons.join("; ");
      reasonsCell.font = { color: { argb: AMBER } };
    });
  }

  summary.getCell(flagsHeaderRow + 3 + report.flags.length, 1).value = `Verify at /verify/${args.jobId}`;
  summary.getCell(flagsHeaderRow + 3 + report.flags.length, 1).font = { size: 8, color: { argb: ACCENT } };

  const data = workbook.addWorksheet("Cleaned Data");
  table.columns.forEach((c, i) => {
    const cell = data.getCell(1, i + 1);
    cell.value = c;
    cell.font = { size: 9, bold: true, color: { argb: MUTED } };
  });
  table.rows.forEach((row, ri) => {
    table.columns.forEach((c, ci) => {
      data.getCell(ri + 2, ci + 1).value = row[c] as ExcelJS.CellValue;
    });
  });
  data.columns.forEach((c) => (c.width = 18));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
