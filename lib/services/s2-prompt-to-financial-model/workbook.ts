import ExcelJS from "exceljs";

export type DcfAssumptions = {
  modelName: string;
  initialRevenue: number;
  growthRate: number;
  ebitdaMargin: number;
  taxRate: number;
  wacc: number;
  terminalGrowth: number;
  years: number;
};

const ACCENT = "FF1D4ED8";
const ACCENT_LIGHT = "FFEEF3FC";
const MUTED = "FF9CA3AF";
const INK = "FF0D1117";

function labelCell(sheet: ExcelJS.Worksheet, ref: string, text: string) {
  const cell = sheet.getCell(ref);
  cell.value = text;
  cell.font = { size: 9, color: { argb: MUTED } };
}

function inputCell(sheet: ExcelJS.Worksheet, ref: string, value: number, numFmt: string) {
  const cell = sheet.getCell(ref);
  cell.value = value;
  cell.numFmt = numFmt;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_LIGHT } };
  cell.font = { color: { argb: ACCENT }, bold: true };
}

/**
 * Builds a real DCF workbook with live formulas (not static values): every projection year
 * and the summary enterprise value reference the Assumptions sheet directly, so changing an
 * assumption in Excel recalculates the whole model - this is the FMVA-grade requirement from
 * BRIEF.md, not a values-only export.
 */
export async function buildDcfWorkbook(
  a: DcfAssumptions,
  meta: { narrative: string; jobId: string }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const assumptions = workbook.addWorksheet("Assumptions");
  assumptions.getColumn("A").width = 32;
  assumptions.getColumn("B").width = 16;

  assumptions.getCell("A1").value = a.modelName;
  assumptions.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  assumptions.getCell("A2").value = "DCF model - edit the highlighted cells to recalculate";
  assumptions.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  labelCell(assumptions, "A4", "Initial annual revenue ($)");
  inputCell(assumptions, "B4", a.initialRevenue, "$#,##0");
  labelCell(assumptions, "A5", "Revenue growth rate");
  inputCell(assumptions, "B5", a.growthRate, "0.0%");
  labelCell(assumptions, "A6", "EBITDA margin");
  inputCell(assumptions, "B6", a.ebitdaMargin, "0.0%");
  labelCell(assumptions, "A7", "Tax rate");
  inputCell(assumptions, "B7", a.taxRate, "0.0%");
  labelCell(assumptions, "A8", "WACC / discount rate");
  inputCell(assumptions, "B8", a.wacc, "0.0%");
  labelCell(assumptions, "A9", "Terminal growth rate");
  inputCell(assumptions, "B9", a.terminalGrowth, "0.0%");
  labelCell(assumptions, "A10", "Projection years");
  inputCell(assumptions, "B10", a.years, "0");

  const proj = workbook.addWorksheet("Projections");
  const headers = ["Year", "Revenue", "EBITDA", "Tax", "Unlevered FCF", "Discount factor", "PV of FCF"];
  headers.forEach((h, i) => {
    const cell = proj.getCell(1, i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: MUTED } };
  });
  proj.columns.forEach((col) => (col.width = 16));

  const firstDataRow = 2;
  const lastDataRow = firstDataRow + a.years - 1;

  for (let i = 0; i < a.years; i++) {
    const row = firstDataRow + i;
    const prevRow = row - 1;

    proj.getCell(`A${row}`).value = i + 1;

    proj.getCell(`B${row}`).value = {
      formula:
        i === 0
          ? `Assumptions!$B$4*(1+Assumptions!$B$5)`
          : `B${prevRow}*(1+Assumptions!$B$5)`,
    } as ExcelJS.CellFormulaValue;
    proj.getCell(`B${row}`).numFmt = "$#,##0";

    proj.getCell(`C${row}`).value = { formula: `B${row}*Assumptions!$B$6` } as ExcelJS.CellFormulaValue;
    proj.getCell(`C${row}`).numFmt = "$#,##0";

    proj.getCell(`D${row}`).value = { formula: `C${row}*Assumptions!$B$7` } as ExcelJS.CellFormulaValue;
    proj.getCell(`D${row}`).numFmt = "$#,##0";

    proj.getCell(`E${row}`).value = { formula: `C${row}-D${row}` } as ExcelJS.CellFormulaValue;
    proj.getCell(`E${row}`).numFmt = "$#,##0";
    proj.getCell(`E${row}`).font = { bold: true };

    proj.getCell(`F${row}`).value = {
      formula: `1/(1+Assumptions!$B$8)^A${row}`,
    } as ExcelJS.CellFormulaValue;
    proj.getCell(`F${row}`).numFmt = "0.000";

    proj.getCell(`G${row}`).value = { formula: `E${row}*F${row}` } as ExcelJS.CellFormulaValue;
    proj.getCell(`G${row}`).numFmt = "$#,##0";
  }

  const tvRow = lastDataRow + 2;
  const pvTvRow = lastDataRow + 3;

  proj.getCell(`A${tvRow}`).value = "Terminal value (undiscounted)";
  proj.getCell(`A${tvRow}`).font = { size: 9, color: { argb: MUTED } };
  proj.getCell(`B${tvRow}`).value = {
    formula: `E${lastDataRow}*(1+Assumptions!$B$9)/(Assumptions!$B$8-Assumptions!$B$9)`,
  } as ExcelJS.CellFormulaValue;
  proj.getCell(`B${tvRow}`).numFmt = "$#,##0";

  proj.getCell(`A${pvTvRow}`).value = "PV of terminal value";
  proj.getCell(`A${pvTvRow}`).font = { size: 9, color: { argb: MUTED } };
  proj.getCell(`B${pvTvRow}`).value = {
    formula: `B${tvRow}*F${lastDataRow}`,
  } as ExcelJS.CellFormulaValue;
  proj.getCell(`B${pvTvRow}`).numFmt = "$#,##0";
  proj.getCell(`B${pvTvRow}`).font = { bold: true };

  const summary = workbook.addWorksheet("Summary");
  summary.getColumn("A").width = 28;
  summary.getColumn("B").width = 18;

  summary.getCell("A1").value = a.modelName;
  summary.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  summary.getCell("A2").value = "One-page summary - QWIBI";
  summary.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  summary.getCell("A4").value = "Enterprise value";
  summary.getCell("A4").font = { size: 10, color: { argb: MUTED } };
  summary.getCell("B4").value = {
    formula: `SUM(Projections!G${firstDataRow}:G${lastDataRow})+Projections!B${pvTvRow}`,
  } as ExcelJS.CellFormulaValue;
  summary.getCell("B4").numFmt = "$#,##0";
  summary.getCell("B4").font = { size: 16, bold: true, color: { argb: ACCENT } };

  summary.getCell("A6").value = "WACC";
  summary.getCell("A6").font = { size: 9, color: { argb: MUTED } };
  summary.getCell("B6").value = { formula: "Assumptions!B8" } as ExcelJS.CellFormulaValue;
  summary.getCell("B6").numFmt = "0.0%";

  summary.getCell("A7").value = "Terminal growth";
  summary.getCell("A7").font = { size: 9, color: { argb: MUTED } };
  summary.getCell("B7").value = { formula: "Assumptions!B9" } as ExcelJS.CellFormulaValue;
  summary.getCell("B7").numFmt = "0.0%";

  summary.getCell("A8").value = "Projection years";
  summary.getCell("A8").font = { size: 9, color: { argb: MUTED } };
  summary.getCell("B8").value = { formula: "Assumptions!B10" } as ExcelJS.CellFormulaValue;

  summary.getCell("A10").value = "Executive summary";
  summary.getCell("A10").font = { size: 10, bold: true, color: { argb: INK } };
  summary.mergeCells("A11:D16");
  const narrativeCell = summary.getCell("A11");
  narrativeCell.value = meta.narrative;
  narrativeCell.font = { size: 9.5, color: { argb: "FF374151" } };
  narrativeCell.alignment = { wrapText: true, vertical: "top" };

  summary.getCell("A18").value =
    "No figures are fabricated - the enterprise value above is computed live from the " +
    "assumptions, and this document is hashed at delivery for independent verification.";
  summary.getCell("A18").font = { size: 8, italic: true, color: { argb: MUTED } };
  summary.mergeCells("A18:D19");
  summary.getCell("A18").alignment = { wrapText: true, vertical: "top" };

  summary.getCell("A21").value = `Prepared ${new Date().toISOString()}`;
  summary.getCell("A21").font = { size: 8, color: { argb: MUTED } };
  summary.getCell("C21").value = `Verify at /verify/${meta.jobId}`;
  summary.getCell("C21").font = { size: 8, color: { argb: ACCENT } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
