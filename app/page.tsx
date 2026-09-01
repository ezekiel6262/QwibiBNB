import { Logo } from "@/components/Logo";

type Service = {
  id: string;
  status: "LIVE" | "FLAGSHIP";
  name: string;
  description: string;
  tags: string;
};

const services: Service[] = [
  {
    id: "1",
    status: "LIVE",
    name: "Market Intelligence",
    description:
      "Crypto and equities cross-asset briefs, on-chain holder/whale/protocol analytics, and " +
      "RWA sector reports (tokenized treasuries, commodities, real estate) - one intelligence " +
      "desk for every asset class.",
    tags: "REPORTS & BRIEFS · ATTESTED",
  },
  {
    id: "2",
    status: "LIVE",
    name: "Data Cleaning & Analysis",
    description:
      "Upload data for full profiling, statistics, outliers, and correlations - or paste " +
      "messy CSV/JSON/on-chain data for cleaned, normalized output with a data quality report.",
    tags: "XLSX + QUALITY REPORT · ATTESTED",
  },
  {
    id: "3",
    status: "LIVE",
    name: "ML Forecasting & Backtesting",
    description:
      "Forecasting with a plain-English model card, plus rule-based strategy backtests - " +
      "equity curve, drawdown, Sharpe, and honest overfitting caveats.",
    tags: "PREDICTIONS + BACKTEST PACK · ATTESTED",
  },
  {
    id: "4",
    status: "LIVE",
    name: "Financial Modeling",
    description:
      "DCF, budgets, unit economics - live formulas, labeled assumptions, scenario toggles.",
    tags: "XLSX + SUMMARY",
  },
  {
    id: "5",
    status: "FLAGSHIP",
    name: "Wallet Financial Statement",
    description: "Bank-grade statement from your addresses. Visa, loan, tax templates.",
    tags: "STATEMENT · ATTESTED",
  },
  {
    id: "6",
    status: "LIVE",
    name: "Reports & Writeups",
    description:
      "Research, structure, charts, and citations from one prompt - or hand it existing " +
      "notes/data to write up as a report, article, proposal, or case study.",
    tags: "PDF + APPENDIX · ATTESTED",
  },
  {
    id: "7",
    status: "LIVE",
    name: "SQL & BI Dashboards",
    description:
      "Ask your database a question with safe, read-only SQL - or turn CSV data into an " +
      "interactive dashboard plus a PowerBI-ready modeled dataset.",
    tags: "SQL + DASHBOARD · ATTESTED",
  },
];

const pipeline = [
  { n: "01", name: "Intake", desc: "Parse prompt, files, connections; confirm scope." },
  { n: "02", name: "Plan", desc: "Decompose into data, compute, and writing tasks." },
  { n: "03", name: "Fetch", desc: "APIs, on-chain providers, web research, your files." },
  { n: "04", name: "Compute", desc: "Sandboxed Python; read-only SQL." },
  { n: "05", name: "Compose", desc: "Narrative, tables, charts, methodology, sources." },
  { n: "06", name: "Attest", desc: "SHA-256 hash and manifest recorded for verification." },
  { n: "07", name: "Deliver", desc: "Finished files, or a registered schedule." },
];

const statusStyle: Record<Service["status"], string> = {
  LIVE: "text-accent",
  FLAGSHIP: "text-accent",
};

function ServiceCard({ s }: { s: Service }) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs text-accent">{s.id}</span>
        <span className={`font-mono text-[10px] tracking-wide ${statusStyle[s.status]}`}>
          {s.status}
        </span>
      </div>
      <p className="mt-2 text-[15px] font-medium">{s.name}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{s.description}</p>
      <p className="mt-4 font-mono text-[10px] tracking-wide text-gray-400">{s.tags}</p>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <nav className="flex items-center justify-between border-b border-gray-200 py-6">
        <div className="flex items-center gap-2.5">
          <Logo className="h-5 w-5" />
          <span className="text-lg font-semibold tracking-tight">QWIBI</span>
        </div>
        <div className="flex items-center gap-9 text-sm text-gray-500">
          <a href="#services">Services</a>
          <a href="#attestation">Attestation</a>
          <a href="#wallet-statement">Wallet Statement</a>
          <a href="#pricing">Pricing</a>
          <a
            href="/run"
            className="bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Run a job
          </a>
        </div>
      </nav>

      <section className="grid grid-cols-1 gap-12 border-b border-gray-200 py-14 md:grid-cols-2">
        <div>
          <p className="font-mono text-[11px] tracking-wide text-accent">
            AI ANALYST DESK &middot; ALGORAND X402
          </p>
          <h1 className="mt-4 text-[44px] font-semibold leading-[1.12] tracking-tight">
            Hire a data science team with <span className="text-accent">one prompt.</span>
          </h1>
          <p className="mt-5 max-w-md text-[16px] text-gray-500">
            QWIBI is a full analyst desk in a single agent: research reports, working
            financial models, ML forecasts, on-chain analytics and bank-grade wallet
            statements - finished, cited, and cryptographically attested. Never a chat
            answer.
          </p>
          <div className="mt-7 flex gap-3">
            <a
              href="/run"
              className="bg-accent px-5 py-3 text-sm font-medium text-white"
            >
              Run your first job
            </a>
            <a
              href="#services"
              className="border border-gray-300 px-5 py-3 text-sm font-medium"
            >
              See sample outputs
            </a>
          </div>
          <p className="mt-6 font-mono text-[11px] tracking-wide text-gray-400">
            7 SERVICES &middot; 5 FILE FORMATS &middot; 100% ATTESTED
          </p>
        </div>

        <div className="relative flex flex-col justify-center">
          <div className="relative h-64">
            <div className="absolute left-6 top-4 h-48 w-64 border border-gray-200 bg-white p-4 shadow-sm">
              <p className="font-mono text-[9px] text-gray-400">DCF_MODEL.XLSX</p>
              <div className="mt-4 space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">WACC</span>
                  <span className="font-medium">8.4%</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-400">TV</span>
                  <span className="font-medium">$142M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">NPV</span>
                  <span className="font-medium">=SUM(...)</span>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 w-72 border border-gray-200 bg-white p-4 shadow-md">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[9px] text-gray-400">REPORT.PDF</p>
                <p className="font-mono text-[9px] text-accent">&#10003; ATTESTED</p>
              </div>
              <p className="mt-3 text-[15px] font-semibold leading-snug">
                RWA Tokenized Treasuries: Q3 Sector Review
              </p>
              <div className="mt-4 flex h-14 items-end gap-1">
                {[30, 40, 45, 55, 75, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-accent"
                    style={{ height: `${h}%`, opacity: 0.35 + (i / 6) * 0.65 }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 bg-ink p-5">
            <p className="font-mono text-[10px] tracking-wide text-accent">
              CRYPTOGRAPHIC ATTESTATION
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="grid h-8 w-8 grid-cols-3 grid-rows-3 gap-[1px]">
                {[1, 0, 1, 0, 1, 0, 1, 0, 1].map((v, i) => (
                  <div key={i} className={v ? "bg-white" : "bg-ink"} />
                ))}
              </div>
              <p className="font-mono text-[11px] text-gray-300">
                sha256 8f3a19&hellip;c45e &middot; verified
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 divide-y divide-gray-200 border-b border-gray-200 md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="py-6 md:pr-8">
          <p className="font-mono text-[10px] tracking-wide text-gray-400">
            EVERY DELIVERABLE
          </p>
          <p className="mt-2 text-[14.5px] font-medium">
            PDF &middot; DOCX &middot; XLSX &middot; interactive HTML dashboard &middot;
            attested statement. Executive-ready, never raw chat.
          </p>
        </div>
        <div className="py-6 md:px-8">
          <p className="font-mono text-[10px] tracking-wide text-gray-400">
            CRYPTOGRAPHICALLY VERIFIED
          </p>
          <p className="mt-2 text-[14.5px] font-medium">
            Hash, timestamp and data-source manifest recorded at delivery. Documents you can
            prove, not fakeable PDFs.
          </p>
        </div>
        <div className="py-6 md:pl-8">
          <p className="font-mono text-[10px] tracking-wide text-gray-400">NO BLACK BOXES</p>
          <p className="mt-2 text-[14.5px] font-medium">
            Methodology and sources pages in every output. Model cards for every forecast.
          </p>
        </div>
      </section>

      <section id="services" className="border-b border-gray-200 py-14">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[26px] font-semibold tracking-tight">
            One agent. Seven services.
          </h2>
          <p className="font-mono text-[11px] tracking-wide text-gray-400">
            FULL CATALOG &middot; 7 LISTINGS
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
      </section>

      <section className="border-b border-gray-200 py-14">
        <h2 className="text-[26px] font-semibold tracking-tight">
          Every job runs the same desk.
        </h2>
        <p className="mt-3 max-w-lg text-[15px] text-gray-500">
          One pipeline behind all seven services - planned, computed in a sandbox,
          composed, and attested before it reaches you.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {pipeline.map((p) => (
            <div key={p.n} className="border border-gray-200 p-4">
              <p className="font-mono text-[10px] text-accent">{p.n}</p>
              <p className="mt-1.5 text-[14px] font-medium">{p.name}</p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-gray-500">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="attestation" className="-mx-6 bg-ink px-6 py-16 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-accent">
              THE MOAT &middot; CRYPTOGRAPHIC ATTESTATION
            </p>
            <h2 className="mt-4 text-[32px] font-semibold leading-tight">
              Anyone can generate a PDF.
              <br />
              <span className="text-accent">Ours can be verified.</span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] text-gray-400">
              Every deliverable&rsquo;s hash, timestamp, and data-source manifest is
              recorded the moment it is delivered. A verification link and QR code are
              embedded in the document; any bank, embassy, or counterparty can look it up
              and confirm the file is untampered and when it was produced. No blockchain
              involved - just a signed record you can check.
            </p>
            <div className="mt-8 flex gap-10">
              <div>
                <p className="text-[20px] font-semibold">SHA-256</p>
                <p className="font-mono text-[10px] text-gray-500">DOCUMENT HASH</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold">Qwibi Verify</p>
                <p className="font-mono text-[10px] text-gray-500">VERIFICATION REGISTRY</p>
              </div>
              <div>
                <p className="text-[20px] font-semibold">&lt;5s</p>
                <p className="font-mono text-[10px] text-gray-500">VERIFY TIME</p>
              </div>
            </div>
          </div>

          <div className="border border-gray-700 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              VERIFICATION RECORD
            </p>
            <div className="mt-4 space-y-3 font-mono text-[12px]">
              {[
                ["document", "wallet_statement_2026-07.pdf"],
                ["sha256", "8f3a19_d2c41e"],
                ["registry", "qwibi verify · record #48291"],
                ["timestamp", "2026-07-14 08:02 UTC"],
                ["sources", "4 APIs · manifest ✓"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span>{v}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">status</span>
                <span className="text-green-400">VERIFIED &middot; UNTAMPERED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="wallet-statement" className="border-b border-gray-200 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] tracking-wide text-accent">FLAGSHIP &middot; S12</p>
            <h2 className="mt-4 text-[32px] font-semibold leading-tight tracking-tight">
              Your wallets, as a bank statement.
            </h2>
            <p className="mt-5 max-w-md text-[15px] text-gray-500">
              Paste your addresses. QWIBI pulls full multi-chain history, prices every
              transaction at time of trade, and clusters your own wallets so
              self-transfers are never counted as income. Every flow is classified, and
              CEX exports are reconciled against the on-chain record.
            </p>
          </div>

          <div className="border border-gray-200 p-6">
            <div className="flex items-baseline justify-between">
              <p className="text-[16px] font-semibold">Wallet Financial Statement</p>
              <p className="font-mono text-[10px] text-accent">
                &#10003; ATTESTED &middot; #8f3a19c41e
              </p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <div>
                <p className="font-mono text-[9px] text-gray-400">MONTHLY INCOME AVG</p>
                <p className="mt-1.5 text-[19px] font-semibold tabular-nums">$8,340</p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-gray-400">STABILITY SCORE</p>
                <p className="mt-1.5 text-[19px] font-semibold text-accent tabular-nums">
                  87 <span className="text-[12px] text-gray-400">/100</span>
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] text-gray-400">NET WORTH TREND</p>
                <p className="mt-1.5 text-[19px] font-semibold tabular-nums">+31% YoY</p>
              </div>
            </div>
            <p className="mt-6 border-t border-gray-100 pt-4 font-mono text-[10px] text-gray-400">
              STATEMENT &middot; JUNE 2026
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-gray-200 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[26px] font-semibold tracking-tight">Simple, per-job pricing.</h2>
          <a
            href="/run"
            className="font-mono text-[11px] tracking-wide text-accent hover:underline"
          >
            X402-GLOBAL-CHALLENGE &middot; COMPOSITE MERCHANT
          </a>
        </div>
        <p className="mt-3 max-w-lg text-[15px] text-gray-500">
          Paid per request in USDC on Algorand through x402. Each endpoint returns a paid
          job response with a report link, verification link, and attestation trail.
          <a href="/run" className="ml-1 text-accent hover:underline">
            Try the operator console
          </a>
          .
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              MARKET & ON-CHAIN INTELLIGENCE
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.50</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              DATA CLEANING & ANALYSIS
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.50</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              FORECASTING & BACKTESTING
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.25</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              FINANCIAL MODEL BUILDER
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.50</p>
          </div>
          <div className="border border-accent p-6">
            <p className="font-mono text-[10px] tracking-wide text-accent">
              WALLET FINANCIAL STATEMENT &middot; FLAGSHIP
            </p>
            <p className="mt-2 text-[28px] font-semibold">$2.00</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              REPORT & WRITEUP STUDIO
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.10</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              TEXT-TO-SQL & BI DASHBOARDS
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.50</p>
          </div>
          <div className="border border-gray-200 p-6">
            <p className="font-mono text-[10px] tracking-wide text-gray-400">
              ATTESTATION VERIFY API
            </p>
            <p className="mt-2 text-[28px] font-semibold">$0.01</p>
            <p className="mt-3 text-[13px] text-gray-500">
              Verify a Qwibi deliverable by job id or SHA-256 attestation hash.
            </p>
          </div>
        </div>
      </section>

      <footer className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <Logo className="h-4 w-4" />
          <span className="text-sm font-semibold">QWIBI</span>
        </div>
        <p className="max-w-md text-[12px] text-gray-400">
          Analysis and reporting only - no custody, no trade execution, no personalized
          investment advice. Built for the Algorand Global x402 Challenge.
        </p>
      </footer>
    </main>
  );
}
