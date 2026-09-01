import { HTTPFacilitatorClient } from "@x402-avm/core/server";
import {
  x402HTTPResourceServer,
  x402ResourceServer,
  type RouteConfig,
  type RoutesConfig,
} from "@x402-avm/core/server";
import { ExactAvmScheme } from "@x402-avm/avm/exact/server";
import {
  ALGORAND_MAINNET_CAIP2,
  ALGORAND_ADDRESS_REGEX,
  ALGORAND_TESTNET_CAIP2,
  USDC_MAINNET_ASA_ID,
  USDC_TESTNET_ASA_ID,
} from "@x402-avm/avm";
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from "@x402-avm/extensions/bazaar";

const FACILITATOR_URL = process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz";
const ALGORAND_NETWORK = (process.env.X402_ALGORAND_NETWORK || "testnet").toLowerCase();
const IS_MAINNET = ALGORAND_NETWORK === "mainnet";
const NETWORK = IS_MAINNET ? ALGORAND_MAINNET_CAIP2 : ALGORAND_TESTNET_CAIP2;
const USDC_ASA_ID = IS_MAINNET ? USDC_MAINNET_ASA_ID : USDC_TESTNET_ASA_ID;
const PAY_TO = process.env.AVM_ADDRESS || "REPLACE_WITH_ALGORAND_PAYTO_ADDRESS";
export const isX402PayToConfigured = ALGORAND_ADDRESS_REGEX.test(PAY_TO);

const facilitatorClient = new HTTPFacilitatorClient({
  url: FACILITATOR_URL,
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactAvmScheme()
).registerExtension(bazaarResourceServerExtension);

type RouteAccepts = RouteConfig;

type JsonSchema = Record<string, unknown>;

/**
 * Declare the official x402 Bazaar HTTP discovery metadata for a JSON POST.
 *
 * Bazaar and x402 health checks may probe endpoints with GET, while the paid
 * business call is POST.
 * The upstream helper deliberately leaves `info.input.method` for a route-aware
 * server extension to fill. `withX402` wraps one handler rather than a method-keyed
 * route table, so pin the advertised business method here. The generated schema
 * still comes entirely from the official helper.
 */
function postDiscovery(
  input: Record<string, unknown>,
  inputSchema: JsonSchema,
  outputExample: Record<string, unknown> = { status: "delivered" }
): Record<string, unknown> {
  const extensions = declareDiscoveryExtension({
    bodyType: "json",
    input,
    inputSchema,
    output: { example: outputExample },
  }) as Record<string, { info?: { input?: Record<string, unknown> } }>;

  const bazaar = extensions.bazaar;
  if (bazaar?.info?.input) bazaar.info.input.method = "POST";
  return extensions;
}

function paidRoute(
  price: string,
  description: string,
  extensions: Record<string, unknown>,
  maxTimeoutSeconds = 300
): RouteAccepts {
  return {
    accepts: {
      scheme: "exact",
      network: NETWORK,
      payTo: PAY_TO,
      price,
      maxTimeoutSeconds,
      extra: {
        tag: "x402-global-challenge",
        project: "Qwibi",
        asset: USDC_ASA_ID,
        currency: "USDC",
        entryType: "composite",
      },
    },
    description,
    mimeType: "application/json",
    extensions,
  };
}

const deliveredOutput = {
  status: "delivered",
  jobId: "00000000-0000-0000-0000-000000000000",
  deliverableUrl: "https://www.qwibi.xyz/report/{jobId}",
  verifyUrl: "https://www.qwibi.xyz/verify/{jobId}",
};

const discovery = {
  market: postDiscovery(
    { cryptoSymbols: "BTC", stockTickers: "AAPL" },
    {
      type: "object",
      properties: {
        cryptoSymbols: { type: "string", description: "Comma-separated crypto symbols" },
        stockTickers: { type: "string", description: "Comma-separated equity tickers" },
        objective: { type: "string", description: "Optional analysis objective" },
      },
      anyOf: [{ required: ["cryptoSymbols"] }, { required: ["stockTickers"] }],
    },
    deliveredOutput
  ),
  clean: postDiscovery(
    { sourceType: "csv", rawInput: "name,amount\nAlice,100" },
    {
      type: "object",
      properties: {
        sourceType: { type: "string", enum: ["csv", "json", "onchain"] },
        rawInput: { type: "string", description: "CSV/JSON text or an on-chain address" },
        targetSchema: { type: "string", description: "Optional desired output schema" },
      },
      required: ["sourceType", "rawInput"],
    },
    deliveredOutput
  ),
  forecast: postDiscovery(
    {
      csvData: "date,value\n2026-01-01,10\n2026-01-02,12\n2026-01-03,14\n2026-01-04,16\n2026-01-05,18\n2026-01-06,20",
      targetColumn: "value",
      horizon: 2,
    },
    {
      type: "object",
      properties: {
        csvData: { type: "string", description: "CSV with a date column and 6+ value rows" },
        targetColumn: { type: "string" },
        horizon: { type: "integer", minimum: 1 },
        strategy: { type: "string", enum: ["sma_crossover", "rsi_threshold", "buy_and_hold"] },
        shortWindow: { type: "integer", minimum: 2 },
        longWindow: { type: "integer", minimum: 3 },
        rsiPeriod: { type: "integer", minimum: 2 },
        oversold: { type: "number", minimum: 0, maximum: 100 },
        overbought: { type: "number", minimum: 0, maximum: 100 },
        initialCapital: { type: "number", exclusiveMinimum: 0 },
      },
      required: ["csvData"],
    },
    { status: "delivered", forecasts: [{ period: "2026-01-07", forecast: 22 }] }
  ),
  financial: postDiscovery(
    { modelName: "Example DCF", initialRevenue: 1000000, years: 5 },
    {
      type: "object",
      properties: {
        modelName: { type: "string" },
        initialRevenue: { type: "number", exclusiveMinimum: 0 },
        growthRate: { type: "number" },
        ebitdaMargin: { type: "number" },
        taxRate: { type: "number" },
        wacc: { type: "number" },
        terminalGrowth: { type: "number" },
        years: { type: "integer", minimum: 1, maximum: 10 },
        context: { type: "string" },
      },
    },
    deliveredOutput
  ),
  wallet: postDiscovery(
    { addresses: "0x0000000000000000000000000000000000000000", template: "personal_review" },
    {
      type: "object",
      properties: {
        addresses: { type: "string", description: "Comma or newline-separated wallet addresses" },
        template: {
          type: "string",
          enum: ["visa_income", "loan_application", "tax_summary", "rental_proof", "freelancer_income", "personal_review"],
        },
      },
      required: ["addresses"],
    },
    deliveredOutput
  ),
  writeup: postDiscovery(
    { mode: "writeup_existing", outputFormat: "project_report", topic: "Example project", existingWorkNotes: "Describe the completed work here." },
    {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["do_assignment", "writeup_existing"] },
        outputFormat: { type: "string", enum: ["project_report", "technical_article", "proposal", "case_study"] },
        topic: { type: "string", minLength: 6 },
        audience: { type: "string" },
        objective: { type: "string" },
        requiredSections: { type: "string" },
        csvData: { type: "string" },
        existingWorkNotes: { type: "string" },
        timeline: { type: "string" },
        budgetNotes: { type: "string" },
      },
      required: ["mode", "outputFormat", "topic"],
    },
    deliveredOutput
  ),
  sqlBi: postDiscovery(
    { question: "Which regions have the highest revenue?" },
    {
      type: "object",
      properties: {
        question: { type: "string", minLength: 6, description: "Natural-language question for the safe demo dataset" },
        csvData: { type: "string", description: "CSV data for dashboard mode" },
        title: { type: "string" },
      },
      anyOf: [{ required: ["question"] }, { required: ["csvData"] }],
    },
    deliveredOutput
  ),
  verify: postDiscovery(
    { jobId: "00000000-0000-0000-0000-000000000000" },
    {
      type: "object",
      properties: {
        jobId: {
          type: "string",
          description: "Qwibi job id from a delivered report, statement, workbook, or dashboard",
        },
        hash: {
          type: "string",
          description: "SHA-256 attestation hash for a Qwibi deliverable",
        },
      },
      anyOf: [{ required: ["jobId"] }, { required: ["hash"] }],
    },
    {
      status: "verified",
      attestationHash: "8f3a19d2c41e...",
      fileType: "pdf",
      untampered: true,
    }
  ),
};

// Register BOTH GET and POST. Listing / x402-check probes use GET and must
// receive a standard 402 challenge (not 405 Method Not Allowed).
const routes: Record<string, RouteAccepts> = {
  "GET /api/x402/market-intelligence": paidRoute(
    "$0.50",
    "Crypto + equity market intelligence brief: real-time prices, an AI-written executive summary, delivered as a cited, attested PDF.",
    discovery.market
  ),
  "POST /api/x402/market-intelligence": paidRoute(
    "$0.50",
    "Crypto + equity market intelligence brief: real-time prices, an AI-written executive summary, delivered as a cited, attested PDF.",
    discovery.market
  ),
  "GET /api/x402/data-clean": paidRoute(
    "$0.50",
    "Clean and structure a raw CSV or JSON dataset into a normalized workbook with a data-quality report.",
    discovery.clean
  ),
  "POST /api/x402/data-clean": paidRoute(
    "$0.50",
    "Clean and structure a raw CSV or JSON dataset into a normalized workbook with a data-quality report.",
    discovery.clean
  ),
  "GET /api/x402/forecasting": paidRoute(
    "$0.25",
    "Time-series forecast with a plain-English model card, or a rule-based strategy backtest (equity curve, drawdown, Sharpe).",
    discovery.forecast
  ),
  "POST /api/x402/forecasting": paidRoute(
    "$0.25",
    "Time-series forecast with a plain-English model card, or a rule-based strategy backtest (equity curve, drawdown, Sharpe).",
    discovery.forecast
  ),
  "GET /api/x402/financial-model": paidRoute(
    "$0.50",
    "A real DCF spreadsheet with live cross-sheet formulas, labeled assumptions, and a one-page enterprise value summary.",
    discovery.financial
  ),
  "POST /api/x402/financial-model": paidRoute(
    "$0.50",
    "A real DCF spreadsheet with live cross-sheet formulas, labeled assumptions, and a one-page enterprise value summary.",
    discovery.financial
  ),
  "GET /api/x402/wallet-statement": paidRoute(
    "$2",
    "A bank-grade statement from on-chain wallet history: income, expenses, a stability score, and a full transaction ledger.",
    discovery.wallet
  ),
  "POST /api/x402/wallet-statement": paidRoute(
    "$2",
    "A bank-grade statement from on-chain wallet history: income, expenses, a stability score, and a full transaction ledger.",
    discovery.wallet
  ),
  "GET /api/x402/report-writeup": paidRoute(
    "$0.1",
    "A fully researched, cited, executive-ready report from one prompt, or a polished writeup of existing notes.",
    discovery.writeup
  ),
  "POST /api/x402/report-writeup": paidRoute(
    "$0.1",
    "A fully researched, cited, executive-ready report from one prompt, or a polished writeup of existing notes.",
    discovery.writeup
  ),
  "GET /api/x402/text-to-sql-bi": paidRoute(
    "$0.50",
    "Ask a database a question in plain English for a safe read-only SQL answer, or turn CSV data into a dashboard.",
    discovery.sqlBi
  ),
  "POST /api/x402/text-to-sql-bi": paidRoute(
    "$0.50",
    "Ask a database a question in plain English for a safe read-only SQL answer, or turn CSV data into a dashboard.",
    discovery.sqlBi
  ),
  "GET /api/x402/verify": paidRoute(
    "$0.01",
    "Verify a Qwibi deliverable by job id or SHA-256 hash: returns attestation status, timestamp, file type, and source manifest.",
    discovery.verify,
    60
  ),
  "POST /api/x402/verify": paidRoute(
    "$0.01",
    "Verify a Qwibi deliverable by job id or SHA-256 hash: returns attestation status, timestamp, file type, and source manifest.",
    discovery.verify,
    60
  ),
};

export const x402HttpServer = new x402HTTPResourceServer(
  resourceServer,
  routes as RoutesConfig
);

export { resourceServer };

/**
 * The per-endpoint config, looked up by request path.
 *
 * `withX402` registers a single wildcard route per endpoint and syncs that to the
 * facilitator; this server registers all fourteen "METHOD /path" keys at once. Both are
 * valid, but feeding one config at a time to `withX402` keeps each endpoint's Bazaar
 * metadata isolated without restating any prices.
 */
export function routeConfigFor(pathname: string): RouteAccepts {
  const config = routes[`POST ${pathname}`] ?? routes[`GET ${pathname}`];
  if (!config) throw new Error(`x402: no route config registered for ${pathname}`);
  return config;
}
