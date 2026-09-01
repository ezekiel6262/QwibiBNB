import { z } from "zod";
import JSZip from "jszip";
import Papa from "papaparse";
import { anthropic } from "@/lib/adapters/anthropic";
import { parseDataset } from "@/lib/services/s3-data-analysis-run/stats";
import type { ComposeResult, ServiceModule, StageContext } from "@/lib/pipeline/types";
import { computeChartSpecs, type ChartSpec } from "./charts";
import { buildDashboardHtml, loadPlotlyJs } from "./dashboard-html";

const inputSchema = z
  .object({
    csvData: z.string().min(20, "paste CSV data with a header row and at least 3 rows"),
    title: z.string().optional(),
  })
  .transform((v) => ({
    csvData: v.csvData,
    title: v.title?.trim() || "Dashboard and BI handoff",
    prompt: `Dashboard: ${v.title?.trim() || "Dashboard and BI handoff"}`,
  }));

function describeFigures(charts: ChartSpec[], rowCount: number, columnCount: number): string {
  const parts = [`${rowCount} rows across ${columnCount} columns.`];
  for (const chart of charts) {
    const trace = chart.traces[0] as { y?: number[] };
    if (Array.isArray(trace.y) && trace.y.length > 0) {
      const max = Math.max(...trace.y);
      const total = trace.y.reduce((s, v) => s + v, 0);
      parts.push(`${chart.title}: peak value ${max.toLocaleString("en-US")}, total ${total.toLocaleString("en-US")}.`);
    }
  }
  return parts.join(" ");
}

function toModeledCsv(dataset: ReturnType<typeof parseDataset>): string {
  const rows = [];
  for (let i = 0; i < dataset.rowCount; i++) {
    const row: Record<string, unknown> = {};
    for (const col of dataset.columns) row[col.name] = col.values[i];
    rows.push(row);
  }
  return Papa.unparse(rows);
}

export const s8DashboardBi: ServiceModule = {
  id: "s8-dashboard-bi",
  label: "Dashboard and BI Handoff",

  validateInputs(inputs: unknown) {
    return inputSchema.parse(inputs);
  },

  async compose(ctx: StageContext): Promise<ComposeResult> {
    const csvData = String(ctx.job.inputs.csvData ?? "");
    const title = String(ctx.job.inputs.title ?? "Dashboard and BI handoff");

    const dataset = parseDataset(csvData);
    const charts = computeChartSpecs(dataset);
    if (charts.length === 0) {
      throw new Error("could not derive any charts from this data - add at least one numeric column");
    }

    const figures = describeFigures(charts, dataset.rowCount, dataset.columns.length);
    const narrative = await anthropic.writeSection({
      heading: "Executive summary",
      instructions: `${ctx.plan.composeInstructions} Key figures to interpret: ${figures}`,
      context: ctx.research,
    });

    const attestationNote =
      "This dashboard and the modeled dataset alongside it are hashed together at delivery " +
      "as a single zip archive; the record is checkable independently of this file at the " +
      "verify link below. A Tableau .hyper extract is not included - there is no viable " +
      "pure-JavaScript path to that proprietary binary format without a native Tableau SDK, " +
      "so this handoff ships an interactive HTML dashboard and a modeled CSV dataset " +
      "(PowerBI and most BI tools import CSV directly) instead.";

    const html = buildDashboardHtml({
      title,
      jobId: ctx.job.id,
      charts,
      rowCount: dataset.rowCount,
      columnCount: dataset.columns.length,
      narrative,
      attestationNote,
      plotlyJs: loadPlotlyJs(),
    });

    const modeledCsv = toModeledCsv(dataset);

    const zip = new JSZip();
    zip.file("dashboard.html", html);
    zip.file("modeled-dataset.csv", modeledCsv);
    const buffer = await zip.generateAsync({ type: "nodebuffer" });

    return { title, file: { buffer, contentType: "application/zip", extension: "zip" } };
  },
};
