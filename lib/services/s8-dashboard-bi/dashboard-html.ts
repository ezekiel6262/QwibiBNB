import fs from "node:fs";
import path from "node:path";
import type { ChartSpec } from "./charts";

export function loadPlotlyJs(): string {
  const filePath = path.join(
    process.cwd(),
    "node_modules",
    "plotly.js-basic-dist-min",
    "plotly-basic.min.js"
  );
  return fs.readFileSync(filePath, "utf-8");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildDashboardHtml(args: {
  title: string;
  jobId: string;
  charts: ChartSpec[];
  rowCount: number;
  columnCount: number;
  narrative: string;
  attestationNote: string;
  plotlyJs: string;
}): string {
  const { title, jobId, charts, rowCount, columnCount, narrative, attestationNote, plotlyJs } = args;
  const preparedAt = new Date().toISOString();

  const chartDivs = charts
    .map((c) => `<div class="panel"><h2>${escapeHtml(c.title)}</h2><div id="${c.id}" class="chart"></div></div>`)
    .join("\n");

  const plotCalls = charts
    .map(
      (c) =>
        `Plotly.newPlot(${JSON.stringify(c.id)}, ${JSON.stringify(c.traces)}, ${JSON.stringify({
          ...c.layout,
          margin: { t: 16, r: 16, b: 48, l: 56 },
          font: { family: "Helvetica, Arial, sans-serif", size: 11 },
        })}, { responsive: true, displaylogo: false });`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)} - QWIBI</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px 48px; font-family: Helvetica, Arial, sans-serif; color: #0d1117; background: #fff; }
  header { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
  .wordmark { font-weight: 700; letter-spacing: 0.5px; font-size: 13px; }
  .tag { margin-left: auto; font-family: "Courier New", monospace; font-size: 10px; color: #9ca3af; }
  h1 { font-size: 20px; margin: 4px 0 4px; }
  .eyebrow { font-family: "Courier New", monospace; font-size: 10px; color: #1d4ed8; text-transform: uppercase; margin-bottom: 8px; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
  .narrative { font-size: 13px; line-height: 1.6; color: #374151; max-width: 860px; margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; }
  .panel { border: 1px solid #e5e7eb; padding: 16px; }
  .panel h2 { font-size: 13px; margin: 0 0 10px; }
  .chart { width: 100%; height: 320px; }
  footer { margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-family: "Courier New", monospace; font-size: 10px; color: #9ca3af; }
  footer a { color: #1d4ed8; }
  .note { font-size: 11px; color: #9ca3af; margin-top: 24px; max-width: 860px; line-height: 1.5; }
</style>
</head>
<body>
<header>
  <span class="wordmark">QWIBI</span>
  <span class="tag">DASHBOARD &amp; BI HANDOFF - S8</span>
</header>
<div class="eyebrow">Data as of ${preparedAt}</div>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${rowCount} rows, ${columnCount} columns. Interactive - hover, zoom, and export any chart below.</div>
<p class="narrative">${escapeHtml(narrative)}</p>
<div class="grid">
${chartDivs}
</div>
<p class="note">${escapeHtml(attestationNote)}</p>
<footer>
  <span>Prepared ${preparedAt}</span>
  <a href="https://qwibi.vercel.app/verify/${jobId}">Verify at qwibi.vercel.app/verify/${jobId}</a>
</footer>
<script>${plotlyJs}</script>
<script>
${plotCalls}
</script>
</body>
</html>`;
}
