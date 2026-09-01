import ExcelJS from "exceljs";
import type { BacktestResult } from "./backtest";

const ACCENT = "FF1D4ED8";
const MUTED = "FF9CA3AF";
const INK = "FF0D1117";
const BODY = "FF374151";
const GREEN = "FF15803D";
const RED = "FFB91C1C";

function headerRow(sheet: ExcelJS.Worksheet, row: number, headers: string[]) {
  headers.forEach((h, i) => {
    const cell = sheet.getCell(row, i + 1);
    cell.value = h;
    cell.font = { size: 9, bold: true, color: { argb: MUTED } };
  });
}

export async function buildBacktestWorkbook(args: {
  title: string;
  priceColumn: string;
  result: BacktestResult;
  narrative: string;
  jobId: string;
}): Promise<Buffer> {
  const { result } = args;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Qwibi";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.getColumn("A").width = 26;
  summary.getColumn("B").width = 60;
  summary.getCell("A1").value = args.title;
  summary.getCell("A1").font = { size: 14, bold: true, color: { argb: INK } };
  summary.getCell("A2").value = `Strategy backtest - QWIBI - price column: ${args.priceColumn}`;
  summary.getCell("A2").font = { size: 9, italic: true, color: { argb: MUTED } };

  const stats: [string, string | number, string?][] = [
    ["Strategy", result.strategyLabel],
    ["Rule", result.ruleDescription],
    ["Initial capital", result.initialCapital],
    ["Final equity", result.finalEquity],
    ["Total return", `${result.totalReturnPct}%`, result.totalReturnPct >= 0 ? GREEN : RED],
    ["Buy and hold return", `${result.buyHoldReturnPct}%`],
    ["Max drawdown", `${result.maxDrawdownPct}%`, RED],
    ["Sharpe ratio (annualized)", result.sharpeRatio],
    ["Win rate", `${result.winRatePct}%`],
    ["Number of trades", result.numTrades],
  ];
  stats.forEach(([label, value, color], i) => {
    const r = 4 + i;
    summary.getCell(r, 1).value = label;
    summary.getCell(r, 1).font = { size: 9.5, color: { argb: BODY } };
    summary.getCell(r, 2).value = value;
    summary.getCell(r, 2).font = { bold: true, color: { argb: color ?? ACCENT } };
    if (label === "Rule") summary.getCell(r, 2).alignment = { wrapText: true };
  });

  const narrativeRow = 5 + stats.length;
  summary.getCell(narrativeRow, 1).value = "Executive summary";
  summary.getCell(narrativeRow, 1).font = { size: 10, bold: true, color: { argb: INK } };
  summary.mergeCells(`A${narrativeRow + 1}:B${narrativeRow + 5}`);
  summary.getCell(narrativeRow + 1, 1).value = args.narrative;
  summary.getCell(narrativeRow + 1, 1).font = { size: 9.5, color: { argb: BODY } };
  summary.getCell(narrativeRow + 1, 1).alignment = { wrapText: true, vertical: "top" };

  const caveatRow = narrativeRow + 7;
  summary.getCell(caveatRow, 1).value = "Overfitting and methodology caveats";
  summary.getCell(caveatRow, 1).font = { size: 10, bold: true, color: { argb: INK } };
  summary.mergeCells(`A${caveatRow + 1}:B${caveatRow + 5}`);
  summary.getCell(caveatRow + 1, 1).value = result.overfittingCaveats;
  summary.getCell(caveatRow + 1, 1).font = { size: 9, color: { argb: MUTED } };
  summary.getCell(caveatRow + 1, 1).alignment = { wrapText: true, vertical: "top" };

  summary.getCell(caveatRow + 7, 1).value = `Prepared ${new Date().toISOString()}`;
  summary.getCell(caveatRow + 7, 1).font = { size: 8, color: { argb: MUTED } };
  summary.getCell(caveatRow + 7, 2).value = `Verify at /verify/${args.jobId}`;
  summary.getCell(caveatRow + 7, 2).font = { size: 8, color: { argb: ACCENT } };

  const equity = workbook.addWorksheet("Equity Curve");
  headerRow(equity, 1, ["Date", "Equity"]);
  result.equityCurve.forEach((p, i) => {
    equity.getCell(i + 2, 1).value = p.date;
    equity.getCell(i + 2, 2).value = p.equity;
  });
  equity.columns.forEach((c) => (c.width = 16));

  const tradeLog = workbook.addWorksheet("Trade Log");
  headerRow(tradeLog, 1, ["Entry date", "Exit date", "Entry price", "Exit price", "P&L %"]);
  result.trades.forEach((t, i) => {
    const r = i + 2;
    tradeLog.getCell(r, 1).value = t.entryDate;
    tradeLog.getCell(r, 2).value = t.exitDate;
    tradeLog.getCell(r, 3).value = Math.round(t.entryPrice * 100) / 100;
    tradeLog.getCell(r, 4).value = Math.round(t.exitPrice * 100) / 100;
    const pnlCell = tradeLog.getCell(r, 5);
    pnlCell.value = Math.round(t.pnlPct * 100) / 100;
    pnlCell.font = { bold: true, color: { argb: t.pnlPct >= 0 ? GREEN : RED } };
  });
  if (result.trades.length === 0) {
    tradeLog.getCell(2, 1).value = "No trades were triggered by this rule over this price history.";
    tradeLog.getCell(2, 1).font = { size: 9, color: { argb: MUTED } };
  }
  tradeLog.columns.forEach((c) => (c.width = 22));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
