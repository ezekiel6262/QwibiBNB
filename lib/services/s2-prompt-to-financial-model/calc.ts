import type { DcfAssumptions } from "./workbook";

export type DcfResult = {
  enterpriseValue: number;
  finalYearFcf: number;
  terminalValue: number;
};

/**
 * Same DCF math as the live formulas in workbook.ts, computed in plain JS. The XLSX itself
 * is the real deliverable (formulas, not these values) - this exists only so the narrative
 * writer has a genuine computed figure to reference instead of fabricating one.
 */
export function computeDcf(a: DcfAssumptions): DcfResult {
  let revenue = a.initialRevenue;
  let finalYearFcf = 0;
  let presentValueSum = 0;

  for (let year = 1; year <= a.years; year++) {
    revenue *= 1 + a.growthRate;
    const ebitda = revenue * a.ebitdaMargin;
    const tax = ebitda * a.taxRate;
    const fcf = ebitda - tax;
    const discountFactor = 1 / Math.pow(1 + a.wacc, year);
    presentValueSum += fcf * discountFactor;
    if (year === a.years) {
      finalYearFcf = fcf;
      const terminalValue = (fcf * (1 + a.terminalGrowth)) / (a.wacc - a.terminalGrowth);
      const pvTerminalValue = terminalValue * discountFactor;
      return {
        enterpriseValue: presentValueSum + pvTerminalValue,
        finalYearFcf,
        terminalValue,
      };
    }
  }

  return { enterpriseValue: presentValueSum, finalYearFcf, terminalValue: 0 };
}
