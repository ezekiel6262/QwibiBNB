"use client";

import { useState, useEffect, type FormEvent } from "react";

const OPERATOR_KEY_STORAGE = "qwibi_operator_key";

/**
 * This console runs the same pipeline the x402 endpoints charge for, so the routes behind
 * it are operator-gated. The key is asked for once and kept in localStorage rather than
 * bundled, so it never ships to visitors who just load the page.
 */
function operatorHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (typeof window === "undefined") return headers;

  let key = window.localStorage.getItem(OPERATOR_KEY_STORAGE);
  if (!key) {
    key = window.prompt("Operator key (required to run jobs on this deployment)") ?? "";
    if (key) window.localStorage.setItem(OPERATOR_KEY_STORAGE, key);
  }
  if (key) headers["x-operator-key"] = key;
  return headers;
}

/** Drop a rejected key so the next attempt asks again instead of retrying a bad one. */
function forgetOperatorKey(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(OPERATOR_KEY_STORAGE);
}

type ServiceId =
  | "s1-prompt-to-report"
  | "s2-prompt-to-financial-model"
  | "s3-data-analysis-run"
  | "s4-ml-forecasts"
  | "s5-onchain-analytics"
  | "s6-market-intelligence"
  | "s7-text-to-sql"
  | "s8-dashboard-bi"
  | "s9-strategy-backtester"
  | "s11-rwa-analytics"
  | "s12-wallet-statement"
  | "s13-writeup-studio"
  | "s14-data-clean";

type RunResult = {
  jobId: string;
  deliverable: { attestationHash: string };
};

type ScheduleRecord = {
  id: string;
  service: string;
  cron: string;
  next_run: string | null;
  active: boolean;
};

const TEMPLATE_OPTIONS: { value: string; label: string }[] = [
  { value: "personal_review", label: "Personal finance review" },
  { value: "visa_income", label: "Digital nomad visa income certificate" },
  { value: "loan_application", label: "Loan application statement" },
  { value: "tax_summary", label: "Tax season summary" },
  { value: "rental_proof", label: "Rental proof of income" },
  { value: "freelancer_income", label: "Freelancer / DAO income verification" },
];

const serviceCopy: Record<ServiceId, { label: string; hint: string }> = {
  "s1-prompt-to-report": {
    label: "S1 · Prompt to Report",
    hint: "Describe what the report should cover.",
  },
  "s2-prompt-to-financial-model": {
    label: "S2 · Financial Model",
    hint: "Set your DCF assumptions - every field has a sensible default.",
  },
  "s3-data-analysis-run": {
    label: "S3 · Data Analysis",
    hint: "Paste CSV data with a header row - full EDA, stats, outliers, correlations.",
  },
  "s4-ml-forecasts": {
    label: "S4 · ML Forecasts",
    hint: "Paste CSV data with a header row - forecasts the last numeric column by default.",
  },
  "s5-onchain-analytics": {
    label: "S5 · On-chain Analytics",
    hint: "Paste a token or protocol address.",
  },
  "s6-market-intelligence": {
    label: "S6 · Market Intelligence",
    hint: "List crypto symbols and stock tickers to compare - analysis framing only, not advice.",
  },
  "s7-text-to-sql": {
    label: "S7 · Text to SQL",
    hint: "Ask a question in plain English - runs against a built-in demo dataset by default.",
  },
  "s8-dashboard-bi": {
    label: "S8 · Dashboard & BI",
    hint: "Paste CSV data with a header row - interactive dashboard + modeled dataset, zipped.",
  },
  "s9-strategy-backtester": {
    label: "S9 · Strategy Backtester",
    hint: "Paste date,price CSV data and pick a rule - real equity curve, drawdown, Sharpe, trade log.",
  },
  "s11-rwa-analytics": {
    label: "S11 · RWA Analytics",
    hint: "Paste a protocol or token address and pick an asset class - yield, backing, redemptions.",
  },
  "s12-wallet-statement": {
    label: "S12 · Wallet Statement",
    hint: "Paste one or more wallet addresses, one per line.",
  },
  "s13-writeup-studio": {
    label: "S13 · Writeup Studio",
    hint: "Do the assignment or write up existing work - pick an output format below.",
  },
  "s14-data-clean": {
    label: "S14 · Data Clean & Structure",
    hint: "Paste messy CSV, a JSON dump, or an on-chain address - get a cleaned, normalized dataset back.",
  },
};

const serviceGroups: { label: string; ids: ServiceId[] }[] = [
  {
    label: "Market Intelligence",
    ids: ["s5-onchain-analytics", "s6-market-intelligence", "s11-rwa-analytics"],
  },
  {
    label: "Data Cleaning & Analysis",
    ids: ["s3-data-analysis-run", "s14-data-clean"],
  },
  {
    label: "ML Forecasting & Backtesting",
    ids: ["s4-ml-forecasts", "s9-strategy-backtester"],
  },
  {
    label: "Financial Modeling",
    ids: ["s2-prompt-to-financial-model"],
  },
  {
    label: "Wallet Financial Statement",
    ids: ["s12-wallet-statement"],
  },
  {
    label: "Reports & Writeups",
    ids: ["s1-prompt-to-report", "s13-writeup-studio"],
  },
  {
    label: "SQL & BI Dashboards",
    ids: ["s7-text-to-sql", "s8-dashboard-bi"],
  },
];

const SAMPLE_CSV =
  "month,revenue\n" +
  "2025-08,18400\n" +
  "2025-09,19100\n" +
  "2025-10,20300\n" +
  "2025-11,21000\n" +
  "2025-12,22400\n" +
  "2026-01,23100\n" +
  "2026-02,24600\n" +
  "2026-03,25200\n" +
  "2026-04,26800\n" +
  "2026-05,27500\n" +
  "2026-06,29100\n" +
  "2026-07,30000";

const SAMPLE_ANALYSIS_CSV =
  "region,price,units_sold,rating\n" +
  "West,19.99,120,4.2\n" +
  "West,24.99,95,4.5\n" +
  "East,19.99,140,3.9\n" +
  "East,29.99,60,4.1\n" +
  "North,14.99,210,4.6\n" +
  "North,14.99,205,4.4\n" +
  "South,34.99,40,3.5\n" +
  "South,29.99,55,3.8\n" +
  "West,199.99,3,4.9\n" +
  "East,22.99,110,4.0\n" +
  "North,17.99,180,4.3\n" +
  "South,27.99,50,3.7";

const SAMPLE_DASHBOARD_CSV =
  "date,region,category,revenue,units\n" +
  "2026-01-05,West,Electronics,4200,58\n" +
  "2026-01-05,East,Home,2100,40\n" +
  "2026-02-04,West,Apparel,3100,52\n" +
  "2026-02-04,North,Electronics,3900,61\n" +
  "2026-02-18,South,Home,1800,33\n" +
  "2026-03-02,West,Electronics,4600,66\n" +
  "2026-03-02,East,Apparel,2500,45\n" +
  "2026-03-20,North,Home,2200,39\n" +
  "2026-04-01,South,Electronics,4100,59\n" +
  "2026-04-01,West,Home,2000,36\n" +
  "2026-04-15,East,Electronics,4800,70\n" +
  "2026-05-03,North,Apparel,2700,47\n" +
  "2026-05-03,South,Electronics,4300,63\n" +
  "2026-05-20,West,Apparel,3300,55\n" +
  "2026-06-01,East,Home,2300,41";

const SAMPLE_PRICE_CSV =
  "date,price\n" +
  "2026-01-01,100.00\n2026-01-02,102.59\n2026-01-03,105.13\n2026-01-04,107.55\n2026-01-05,109.82\n" +
  "2026-01-06,111.88\n2026-01-07,113.70\n2026-01-08,115.23\n2026-01-09,116.46\n2026-01-10,117.37\n" +
  "2026-01-11,117.94\n2026-01-12,118.19\n2026-01-13,118.11\n2026-01-14,117.73\n2026-01-15,117.08\n" +
  "2026-01-16,116.18\n2026-01-17,115.09\n2026-01-18,113.84\n2026-01-19,112.49\n2026-01-20,111.10\n" +
  "2026-01-21,109.71\n2026-01-22,108.39\n2026-01-23,107.18\n2026-01-24,106.15\n2026-01-25,105.32\n" +
  "2026-01-26,104.74\n2026-01-27,104.45\n2026-01-28,104.47\n2026-01-29,104.81\n2026-01-30,105.49\n" +
  "2026-01-31,106.49\n2026-02-01,107.82\n2026-02-02,109.44\n2026-02-03,111.33\n2026-02-04,113.46\n" +
  "2026-02-05,115.78\n2026-02-06,118.25\n2026-02-07,120.80\n2026-02-08,123.40\n2026-02-09,125.98\n" +
  "2026-02-10,128.49\n2026-02-11,130.87\n2026-02-12,133.08\n2026-02-13,135.08\n2026-02-14,136.81\n" +
  "2026-02-15,138.26\n2026-02-16,139.39\n2026-02-17,140.20\n2026-02-18,140.67\n2026-02-19,140.82\n" +
  "2026-02-20,140.65\n2026-02-21,140.18\n2026-02-22,139.45\n2026-02-23,138.49\n2026-02-24,137.35\n" +
  "2026-02-25,136.06\n2026-02-26,134.70\n2026-02-27,133.30\n2026-02-28,131.93\n2026-03-01,130.63";

const SAMPLE_MESSY_CSV =
  "Date, Counterparty ,Amount, Category\n" +
  "01/05/2026,Acme Corp,\"$1,200.00\",Consulting\n" +
  "2026-01-06,Beta LLC,$450.00,Consulting\n" +
  "01/06/2026,Beta LLC,$450.00,Consulting\n" +
  "Jan 8, 2026,Gamma Inc,N/A,Software\n" +
  "01/09/2026,,$300.00,Software\n" +
  "13/01/2026,Delta Co,\"$2,750.50\",Consulting\n" +
  "01/14/2026,Epsilon Ltd,not a number,Software\n";

type DcfForm = {
  modelName: string;
  initialRevenue: string;
  growthRate: string;
  ebitdaMargin: string;
  taxRate: string;
  wacc: string;
  terminalGrowth: string;
  years: string;
  context: string;
};

const DCF_FIELDS: { key: keyof DcfForm; label: string; placeholder: string }[] = [
  { key: "modelName", label: "Model name", placeholder: "DCF Model" },
  { key: "initialRevenue", label: "Initial revenue ($)", placeholder: "1,000,000" },
  { key: "growthRate", label: "Growth rate (%)", placeholder: "15" },
  { key: "ebitdaMargin", label: "EBITDA margin (%)", placeholder: "25" },
  { key: "taxRate", label: "Tax rate (%)", placeholder: "21" },
  { key: "wacc", label: "WACC (%)", placeholder: "10" },
  { key: "terminalGrowth", label: "Terminal growth (%)", placeholder: "3" },
  { key: "years", label: "Projection years", placeholder: "5" },
];

export default function RunPage() {
  const [service, setService] = useState<ServiceId>("s1-prompt-to-report");
  const [prompt, setPrompt] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [addresses, setAddresses] = useState("");
  const [template, setTemplate] = useState("personal_review");
  const [dcf, setDcf] = useState<DcfForm>({
    modelName: "",
    initialRevenue: "",
    growthRate: "",
    ebitdaMargin: "",
    taxRate: "",
    wacc: "",
    terminalGrowth: "",
    years: "",
    context: "",
  });
  const [csvData, setCsvData] = useState(SAMPLE_CSV);
  const [targetColumn, setTargetColumn] = useState("");
  const [horizon, setHorizon] = useState("6");
  const [objective, setObjective] = useState("");
  const [analysisCsv, setAnalysisCsv] = useState(SAMPLE_ANALYSIS_CSV);
  const [question, setQuestion] = useState("");
  const [cryptoSymbols, setCryptoSymbols] = useState("BTC, ETH, SOL");
  const [stockTickers, setStockTickers] = useState("AAPL, MSFT, NVDA");
  const [marketObjective, setMarketObjective] = useState("");
  const [sqlQuestion, setSqlQuestion] = useState("top 5 products by total revenue");
  const [connectionString, setConnectionString] = useState("");
  const [dashboardCsv, setDashboardCsv] = useState(SAMPLE_DASHBOARD_CSV);
  const [dashboardTitle, setDashboardTitle] = useState("");
  const [priceCsv, setPriceCsv] = useState(SAMPLE_PRICE_CSV);
  const [strategy, setStrategy] = useState<"sma_crossover" | "rsi_threshold" | "buy_and_hold">(
    "sma_crossover"
  );
  const [shortWindow, setShortWindow] = useState("10");
  const [longWindow, setLongWindow] = useState("20");
  const [initialCapital, setInitialCapital] = useState("10000");
  const [rwaAddress, setRwaAddress] = useState("");
  const [assetClass, setAssetClass] = useState<"treasury" | "commodity" | "real_estate">(
    "treasury"
  );
  const [writeupMode, setWriteupMode] = useState<"do_assignment" | "writeup_existing">(
    "do_assignment"
  );
  const [writeupFormat, setWriteupFormat] = useState<
    "project_report" | "technical_article" | "proposal" | "case_study"
  >("project_report");
  const [writeupTopic, setWriteupTopic] = useState("");
  const [writeupObjective, setWriteupObjective] = useState("");
  const [writeupCsv, setWriteupCsv] = useState("");
  const [writeupTargetColumn, setWriteupTargetColumn] = useState("");
  const [writeupNotes, setWriteupNotes] = useState("");
  const [writeupTimeline, setWriteupTimeline] = useState("");
  const [writeupBudget, setWriteupBudget] = useState("");
  const [companionThread, setCompanionThread] = useState(false);
  const [cleanSourceType, setCleanSourceType] = useState<"csv" | "onchain" | "json">("csv");
  const [cleanRawInput, setCleanRawInput] = useState(SAMPLE_MESSY_CSV);
  const [cleanTargetSchema, setCleanTargetSchema] = useState("date, counterparty, amount, category");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [scheduleInterval, setScheduleInterval] = useState<"daily" | "weekly">("daily");
  const [scheduleStatus, setScheduleStatus] = useState<"idle" | "saving" | "error">("idle");
  const [scheduleError, setScheduleError] = useState("");

  async function refreshSchedules() {
    const res = await fetch("/api/schedules");
    if (!res.ok) return;
    const data = await res.json();
    setSchedules(data.schedules ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/schedules")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setSchedules(data.schedules ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit =
    status !== "running" &&
    (service === "s1-prompt-to-report"
      ? prompt.trim().length >= 8
      : service === "s5-onchain-analytics"
        ? tokenAddress.trim().length >= 6
        : service === "s12-wallet-statement"
          ? addresses.trim().length >= 6
          : service === "s4-ml-forecasts"
            ? csvData.trim().length >= 20
            : service === "s3-data-analysis-run"
              ? analysisCsv.trim().length >= 20
              : service === "s6-market-intelligence"
                ? cryptoSymbols.trim().length >= 1 && stockTickers.trim().length >= 1
                : service === "s7-text-to-sql"
                  ? sqlQuestion.trim().length >= 6
                  : service === "s8-dashboard-bi"
                    ? dashboardCsv.trim().length >= 20
                    : service === "s9-strategy-backtester"
                      ? priceCsv.trim().length >= 20
                      : service === "s11-rwa-analytics"
                        ? rwaAddress.trim().length >= 6
                        : service === "s13-writeup-studio"
                          ? writeupTopic.trim().length >= 6 &&
                            (writeupMode !== "writeup_existing" || writeupNotes.trim().length >= 20)
                          : service === "s14-data-clean"
                            ? cleanRawInput.trim().length >= 3
                            : true);

  function buildBody(): Record<string, unknown> {
    return service === "s1-prompt-to-report"
        ? { service, prompt }
        : service === "s5-onchain-analytics"
          ? { service, tokenAddress }
          : service === "s12-wallet-statement"
            ? { service, addresses, template }
            : service === "s4-ml-forecasts"
              ? {
                  service,
                  csvData,
                  targetColumn: targetColumn || undefined,
                  horizon: horizon ? Number(horizon) : undefined,
                  objective: objective || undefined,
                }
              : service === "s3-data-analysis-run"
                ? { service, csvData: analysisCsv, question: question || undefined }
                : service === "s6-market-intelligence"
                  ? {
                      service,
                      cryptoSymbols,
                      stockTickers,
                      objective: marketObjective || undefined,
                    }
                  : service === "s7-text-to-sql"
                    ? {
                        service,
                        question: sqlQuestion,
                        connectionString: connectionString || undefined,
                      }
                    : service === "s8-dashboard-bi"
                      ? { service, csvData: dashboardCsv, title: dashboardTitle || undefined }
                      : service === "s9-strategy-backtester"
                        ? {
                            service,
                            csvData: priceCsv,
                            strategy,
                            shortWindow: shortWindow ? Number(shortWindow) : undefined,
                            longWindow: longWindow ? Number(longWindow) : undefined,
                            initialCapital: initialCapital ? Number(initialCapital) : undefined,
                          }
                        : service === "s11-rwa-analytics"
                          ? { service, protocolAddress: rwaAddress, assetClass }
                          : service === "s13-writeup-studio"
                            ? {
                                service,
                                mode: writeupMode,
                                outputFormat: writeupFormat,
                                topic: writeupTopic,
                                objective: writeupObjective || undefined,
                                csvData: writeupCsv || undefined,
                                targetColumn: writeupTargetColumn || undefined,
                                existingWorkNotes:
                                  writeupMode === "writeup_existing" ? writeupNotes : undefined,
                                timeline: writeupTimeline || undefined,
                                budgetNotes: writeupBudget || undefined,
                                companionThread:
                                  writeupFormat === "technical_article" ? companionThread : undefined,
                              }
                            : service === "s14-data-clean"
                              ? {
                                  service,
                                  sourceType: cleanSourceType,
                                  rawInput: cleanRawInput,
                                  targetSchema: cleanTargetSchema || undefined,
                                }
                              : {
                  service,
                  modelName: dcf.modelName || undefined,
                  initialRevenue: dcf.initialRevenue ? Number(dcf.initialRevenue) : undefined,
                  growthRate: dcf.growthRate ? Number(dcf.growthRate) : undefined,
                  ebitdaMargin: dcf.ebitdaMargin ? Number(dcf.ebitdaMargin) : undefined,
                  taxRate: dcf.taxRate ? Number(dcf.taxRate) : undefined,
                  wacc: dcf.wacc ? Number(dcf.wacc) : undefined,
                  terminalGrowth: dcf.terminalGrowth ? Number(dcf.terminalGrowth) : undefined,
                  years: dcf.years ? Number(dcf.years) : undefined,
                  context: dcf.context || undefined,
                };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("running");
    setErrorMessage("");

    const body = buildBody();

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: operatorHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) forgetOperatorKey();
      setStatus("error");
      setErrorMessage(data.error ?? "something went wrong");
      return;
    }

    setResult(data);
    setStatus("done");
  }

  async function handleCreateSchedule() {
    setScheduleStatus("saving");
    setScheduleError("");

    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: operatorHeaders(),
      body: JSON.stringify({ service, config: buildBody(), interval: scheduleInterval }),
    });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) forgetOperatorKey();
      setScheduleStatus("error");
      setScheduleError(data.error ?? "could not create schedule");
      return;
    }

    setScheduleStatus("idle");
    await refreshSchedules();
  }

  async function handleDeleteSchedule(id: string) {
    await fetch(`/api/schedules/${id}`, { method: "DELETE", headers: operatorHeaders() });
    await refreshSchedules();
  }

  function selectService(next: ServiceId) {
    setService(next);
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <p className="font-mono text-[11px] tracking-wide text-accent">
        {serviceCopy[service].label}
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Run your first job.</h1>
      <p className="mt-2 text-sm text-gray-500">
        {serviceCopy[service].hint} In mock mode this runs instantly on fixture data - no
        API keys required.
      </p>

      <div className="mt-6 space-y-3 text-sm">
        {serviceGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-gray-400">
              {group.label.toUpperCase()}
            </p>
            <div className="flex flex-wrap gap-2">
              {group.ids.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectService(id)}
                  className={
                    service === id
                      ? "border border-accent bg-accent px-3 py-1.5 text-white"
                      : "border border-gray-300 px-3 py-1.5 text-gray-600"
                  }
                >
                  {serviceCopy[id].label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        {service === "s1-prompt-to-report" && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Sector review of tokenized treasury protocols in Q3 2026"
            rows={4}
            className="w-full resize-none border border-gray-300 p-3 text-sm outline-none focus:border-accent"
          />
        )}
        {service === "s5-onchain-analytics" && (
          <input
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            placeholder="e.g. 0x1ef8f984a2b7c4e9d0f1a3b5c6d7e8f9a0b1c2d3"
            className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
          />
        )}
        {service === "s12-wallet-statement" && (
          <>
            <textarea
              value={addresses}
              onChange={(e) => setAddresses(e.target.value)}
              placeholder={"0x1ef8f984a2b7c4e9d0f1a3b5c6d7e8f9a0b1c2d3\n0x88ab7766554433221100ffeeddccbbaa9988771"}
              rows={3}
              className="w-full resize-none border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            >
              {TEMPLATE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </>
        )}
        {service === "s3-data-analysis-run" && (
          <>
            <textarea
              value={analysisCsv}
              onChange={(e) => setAnalysisCsv(e.target.value)}
              rows={6}
              className="w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Optional question, e.g. what drives units sold?"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
        {service === "s4-ml-forecasts" && (
          <>
            <textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={6}
              className="w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Target column
                </span>
                <input
                  value={targetColumn}
                  onChange={(e) => setTargetColumn(e.target.value)}
                  placeholder="auto"
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Horizon (periods)
                </span>
                <input
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  placeholder="6"
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="col-span-1 block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Objective
                </span>
                <input
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Forecast revenue"
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>
          </>
        )}
        {service === "s6-market-intelligence" && (
          <>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                Crypto symbols (comma-separated)
              </span>
              <input
                value={cryptoSymbols}
                onChange={(e) => setCryptoSymbols(e.target.value)}
                placeholder="BTC, ETH, SOL"
                className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                Stock tickers (comma-separated)
              </span>
              <input
                value={stockTickers}
                onChange={(e) => setStockTickers(e.target.value)}
                placeholder="AAPL, MSFT, NVDA"
                className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <input
              value={marketObjective}
              onChange={(e) => setMarketObjective(e.target.value)}
              placeholder="Optional focus, e.g. risk appetite across asset classes"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
        {service === "s7-text-to-sql" && (
          <>
            <input
              value={sqlQuestion}
              onChange={(e) => setSqlQuestion(e.target.value)}
              placeholder="e.g. top 5 products by total revenue"
              className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
            <input
              value={connectionString}
              onChange={(e) => setConnectionString(e.target.value)}
              placeholder="Optional: postgres://... (leave blank to use the demo dataset)"
              className="mt-3 w-full border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-gray-400">
              Demo dataset is a 24-row orders table. Try: &quot;total revenue&quot;, &quot;orders
              by region&quot;, &quot;average order value in the west&quot;, &quot;top 3 customers
              by revenue&quot;.
            </p>
          </>
        )}
        {service === "s8-dashboard-bi" && (
          <>
            <textarea
              value={dashboardCsv}
              onChange={(e) => setDashboardCsv(e.target.value)}
              rows={6}
              className="w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <input
              value={dashboardTitle}
              onChange={(e) => setDashboardTitle(e.target.value)}
              placeholder="Optional dashboard title"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
        {service === "s9-strategy-backtester" && (
          <>
            <textarea
              value={priceCsv}
              onChange={(e) => setPriceCsv(e.target.value)}
              rows={6}
              className="w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
            />
            <div className="mt-3 grid grid-cols-4 gap-3">
              <label className="col-span-2 block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Rule
                </span>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="sma_crossover">SMA crossover</option>
                  <option value="rsi_threshold">RSI threshold</option>
                  <option value="buy_and_hold">Buy and hold (baseline)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Short window
                </span>
                <input
                  value={shortWindow}
                  onChange={(e) => setShortWindow(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Long window
                </span>
                <input
                  value={longWindow}
                  onChange={(e) => setLongWindow(e.target.value)}
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>
            <label className="mt-3 block w-40">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                Initial capital ($)
              </span>
              <input
                value={initialCapital}
                onChange={(e) => setInitialCapital(e.target.value)}
                className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
          </>
        )}
        {service === "s11-rwa-analytics" && (
          <>
            <input
              value={rwaAddress}
              onChange={(e) => setRwaAddress(e.target.value)}
              placeholder="e.g. 0x9f2c4d1a3b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e"
              className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value as typeof assetClass)}
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            >
              <option value="treasury">Tokenized treasury</option>
              <option value="commodity">Tokenized commodity</option>
              <option value="real_estate">Tokenized real estate</option>
            </select>
          </>
        )}
        {service === "s13-writeup-studio" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Mode
                </span>
                <select
                  value={writeupMode}
                  onChange={(e) => setWriteupMode(e.target.value as typeof writeupMode)}
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="do_assignment">Do the assignment</option>
                  <option value="writeup_existing">Write up existing work</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                  Output format
                </span>
                <select
                  value={writeupFormat}
                  onChange={(e) => setWriteupFormat(e.target.value as typeof writeupFormat)}
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                >
                  <option value="project_report">Project report</option>
                  <option value="technical_article">Technical article</option>
                  <option value="proposal">Proposal</option>
                  <option value="case_study">Case study</option>
                </select>
              </label>
            </div>
            <input
              value={writeupTopic}
              onChange={(e) => setWriteupTopic(e.target.value)}
              placeholder="Project or topic, e.g. Predictive maintenance on turbofan sensor data"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
            <input
              value={writeupObjective}
              onChange={(e) => setWriteupObjective(e.target.value)}
              placeholder="Optional objective / audience"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
            {writeupMode === "do_assignment" ? (
              <>
                <textarea
                  value={writeupCsv}
                  onChange={(e) => setWriteupCsv(e.target.value)}
                  placeholder="Optional CSV data to analyze (leave blank for a text-only writeup)"
                  rows={4}
                  className="mt-3 w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
                />
                <input
                  value={writeupTargetColumn}
                  onChange={(e) => setWriteupTargetColumn(e.target.value)}
                  placeholder="Optional target column to forecast"
                  className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
                />
              </>
            ) : (
              <>
                <textarea
                  value={writeupNotes}
                  onChange={(e) => setWriteupNotes(e.target.value)}
                  placeholder="Describe the existing work - what you did, methods, findings (at least 20 characters)"
                  rows={4}
                  className="mt-3 w-full resize-none border border-gray-300 p-3 text-sm outline-none focus:border-accent"
                />
                <textarea
                  value={writeupCsv}
                  onChange={(e) => setWriteupCsv(e.target.value)}
                  placeholder="Optional results CSV to ground the numbers referenced above"
                  rows={3}
                  className="mt-3 w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
                />
              </>
            )}
            {writeupFormat === "proposal" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  value={writeupTimeline}
                  onChange={(e) => setWriteupTimeline(e.target.value)}
                  placeholder="Timeline"
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
                <input
                  value={writeupBudget}
                  onChange={(e) => setWriteupBudget(e.target.value)}
                  placeholder="Budget / resources"
                  className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
            )}
            {writeupFormat === "technical_article" && (
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={companionThread}
                  onChange={(e) => setCompanionThread(e.target.checked)}
                />
                Include a companion X thread draft
              </label>
            )}
          </>
        )}
        {service === "s14-data-clean" && (
          <>
            <select
              value={cleanSourceType}
              onChange={(e) => {
                const next = e.target.value as typeof cleanSourceType;
                setCleanSourceType(next);
                if (next === "csv") setCleanRawInput(SAMPLE_MESSY_CSV);
                else if (next === "json")
                  setCleanRawInput(
                    '[{"date":"2026-01-05","from":{"name":"Acme Corp"},"amount":"$1,200.00"},{"date":"2026-01-06","from":{"name":"Beta LLC"},"amount":"$450.00"}]'
                  );
                else setCleanRawInput("0x1ef8f984a2b7c4e9d0f1a3b5c6d7e8f9a0b1c2d3");
              }}
              className="w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            >
              <option value="csv">Messy CSV / Excel paste</option>
              <option value="json">Raw JSON dump</option>
              <option value="onchain">On-chain address</option>
            </select>
            {cleanSourceType === "onchain" ? (
              <input
                value={cleanRawInput}
                onChange={(e) => setCleanRawInput(e.target.value)}
                placeholder="0x1ef8f984a2b7c4e9d0f1a3b5c6d7e8f9a0b1c2d3"
                className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
              />
            ) : (
              <textarea
                value={cleanRawInput}
                onChange={(e) => setCleanRawInput(e.target.value)}
                rows={6}
                className="mt-3 w-full resize-none border border-gray-300 p-3 font-mono text-xs outline-none focus:border-accent"
              />
            )}
            <input
              value={cleanTargetSchema}
              onChange={(e) => setCleanTargetSchema(e.target.value)}
              placeholder="Optional target schema, e.g. date, counterparty, amount, category"
              className="mt-3 w-full border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
        {service === "s2-prompt-to-financial-model" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {DCF_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-gray-400">
                    {f.label}
                  </span>
                  <input
                    value={dcf[f.key]}
                    onChange={(e) => setDcf((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
                  />
                </label>
              ))}
            </div>
            <textarea
              value={dcf.context}
              onChange={(e) => setDcf((prev) => ({ ...prev, context: e.target.value }))}
              placeholder="Optional context, e.g. what the business does (used in the summary narrative only, never in the formulas)"
              rows={2}
              className="mt-3 w-full resize-none border border-gray-300 p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-3 bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {status === "running" ? "Running..." : "Run job"}
        </button>
      </form>

      {status === "error" && <p className="mt-6 text-sm text-red-600">{errorMessage}</p>}

      {status === "done" && result && (
        <div className="mt-8 border border-gray-200 p-5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-gray-400">
            Delivered
          </p>
          <p className="mt-2 font-mono text-[12px] text-gray-500">
            sha256 {result.deliverable.attestationHash.slice(0, 16)}&hellip;
          </p>
          <div className="mt-4 flex gap-3 text-sm">
            <a href={`/report/${result.jobId}`} className="text-accent underline" target="_blank">
              View report
            </a>
            <a href={`/verify/${result.jobId}`} className="text-accent underline" target="_blank">
              Verify
            </a>
          </div>
        </div>
      )}

      <div className="mt-10 border-t border-gray-200 pt-6">
        <p className="font-mono text-[10px] uppercase tracking-wide text-gray-400">
          S10 · Scheduled runs
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Save the current form as a recurring job. A daily Vercel Cron tick checks which
          schedules are due and re-runs them - the interval below controls how often that is,
          not the cron tick itself.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <select
            value={scheduleInterval}
            onChange={(e) => setScheduleInterval(e.target.value as "daily" | "weekly")}
            className="border border-gray-300 p-2.5 text-sm outline-none focus:border-accent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="button"
            onClick={handleCreateSchedule}
            disabled={!canSubmit || scheduleStatus === "saving"}
            className="border border-accent px-4 py-2 text-sm font-medium text-accent disabled:opacity-40"
          >
            {scheduleStatus === "saving" ? "Saving..." : `Schedule ${serviceCopy[service].label}`}
          </button>
        </div>
        {scheduleStatus === "error" && (
          <p className="mt-2 text-sm text-red-600">{scheduleError}</p>
        )}

        {schedules.length > 0 && (
          <div className="mt-5 space-y-2">
            {schedules.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium">{serviceCopy[s.service as ServiceId]?.label ?? s.service}</span>
                  <span className="ml-2 font-mono text-[11px] text-gray-400">
                    {s.cron} · next {s.next_run ? new Date(s.next_run).toLocaleString() : "-"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSchedule(s.id)}
                  className="font-mono text-[11px] text-gray-400 hover:text-red-600"
                >
                  cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
