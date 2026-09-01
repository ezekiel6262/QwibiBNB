# QWIBI - Build Brief

Built for the OKX AI Hackathon (OKX AI Marketplace, Agent Service Provider track).
Final submission deadline: **July 26, 2026**. The agent will be listed on the OKX AI
marketplace as an Agent Service Provider once submitted. Build for a working, demoable
product, not a prototype.

## What we are building

Qwibi is a single AI agent that operates as a full data and analytics desk, listed as an
Agent Service Provider on the OKX AI marketplace. It takes one prompt (plus optional data:
files, wallet addresses, database connections) and returns a finished, professional
deliverable: a report, financial model, dataset analysis, ML forecast, on-chain analytics
report, dashboard, project writeup, proposal, or verifiable wallet financial statement.
Every deliverable is hashed (SHA-256) with a manifest recorded at delivery time, and is
checkable through a hosted verify link, so it is a verifiable document, not a fakeable PDF.
No blockchain, no smart contract, no on-chain submission of any kind - verification is
off-chain and cryptographic, hosted by Qwibi itself.

Positioning: "Hire a data science team with one prompt." Never return a raw chat answer -
every job ends in a polished file.

## Stack

- Next.js 14 (App Router), TypeScript
- Supabase: auth, Postgres (jobs, users, deliverables, schedules), storage for output files
- Claude API (claude-sonnet-4-6) with tool use: planner, classifier, and writer roles
- Sandboxed Python compute: e2b.dev (preferred) or Modal - runs pandas, numpy, scikit-learn,
  XGBoost, Prophet, statsmodels, Plotly
- Deliverable generation: PDF (react-pdf or Puppeteer HTML-to-PDF), DOCX (docx npm lib),
  XLSX (exceljs - must produce live formulas, not static values), Plotly for charts and
  interactive HTML dashboards
- On-chain data: Moralis or Covalent (multi-chain tx history), Dune API (analytics queries),
  direct RPC fallback
- Market data: CoinGecko (historical prices), CoinMarketCap or CryptoRank (crypto intel),
  Alpha Vantage or yfinance via Python sandbox (equities)
- Attestation: no smart contract, no chain deployment of any kind. Every deliverable is
  SHA-256 hashed and a manifest (sources, timestamp, job id) is written to Supabase at
  delivery time. A hosted verify page (`/verify/[hash]`) looks up the manifest so anyone
  with the link or QR code can confirm the document is untampered - purely off-chain.
- Scheduling: Supabase pg_cron or Vercel cron for recurring jobs
- Deploy: Vercel

Internal pipeline architecture (intake, planning, data fetching, compute, document
composition, attestation, delivery) - job orchestration, queueing, and state model are ours
to design against this stack. Every service ends in a downloadable, attested file, and
progress is visible to the user while a job runs. Env vars / API keys are listed clearly
wherever an integration is configured.

## Services (13 underlying pipelines, presented as 7 marketplace listings)

The OKX AI Marketplace catalog groups these 13 pipelines into 7 listings for presentation;
the underlying service modules, slugs, and this per-service documentation are unchanged -
only the marketing-facing grouping differs from the code layout.

| # | Marketplace listing | Underlying services |
|---|---|---|
| 1 | Market Intelligence | S5 On-chain Analytics + S6 Market Intelligence + S11 RWA Analytics |
| 2 | Data Cleaning & Analysis | S3 Data Analysis Run + S14 Data Clean and Structure |
| 3 | ML Forecasting & Backtesting | S4 ML Forecasts + S9 Strategy Backtester |
| 4 | Financial Modeling | S2 Prompt to Financial Model |
| 5 | Wallet Financial Statement (flagship) | S12 Wallet Financial Statement |
| 6 | Reports & Writeups | S1 Prompt to Report + S13 Project Writeup and Proposal Studio |
| 7 | SQL & BI Dashboards | S7 Text-to-SQL + S8 Dashboard and BI Handoff |

S10 Scheduled Agents and Alerts stays a cross-cutting capability (any service can run on a
schedule) rather than its own listing.

**S1. Prompt to Report** - topic prompt, optional URLs/files/length/audience. Web research,
structure, charts, citations. Output: PDF or DOCX with charts, sources page, methodology
page. Attested.

**S2. Prompt to Spreadsheet / Financial Model** - model description (DCF, budget forecast,
unit economics, pricing model), optional assumptions. Output: XLSX with live formulas,
labeled assumption cells, scenario toggles, plus one-page summary. FMVA-grade structure.

**S3. Data Analysis Run** - CSV/XLSX upload or DB connection + question. Full EDA, cleaning,
stats, outliers, charts. Output: insights PDF + cleaned dataset + chart pack.

**S4. Predictive and ML Workflows** - dataset + objective. Auto model selection
(Prophet/statsmodels time series; XGBoost/scikit-learn classification/regression),
train/val split, evaluation. Output: predictions file + plain-English model card (model,
metrics, limitations).

**S5. On-chain Analytics Report** - token address, protocol, or wallet set + goal. Dune API
+ RPC. Holder distribution, wallet flows, whale movements, protocol revenue, TVL, DEX volume.
Output: analytics report with charts and interpretation. Attested.

**S6. Market Intelligence** - crypto + stocks cross-asset briefs. Clearly labeled "data as
of" timestamp. Analysis framing only, never personalized investment advice.

**S7. Text-to-SQL** - natural language against user Postgres/Supabase (READ-ONLY credentials
enforced, row limits, statement timeout, block non-SELECT). Output: query + results + chart
+ plain-English answer.

**S8. Dashboard and BI Handoff** - interactive Plotly HTML dashboard + Tableau Hyper extract
+ PowerBI-ready modeled dataset. We produce assets those tools consume; we do not control
them.

**S9. Strategy Backtester** - plain-English rule strategy, translate to code, run on
historical data. Output: equity curve, max drawdown, Sharpe, win rate, trade log, honest
overfitting caveats.

**S10. Scheduled Agents and Alerts** - any service on a cron or trigger condition. Recurring
deliverables + anomaly alerts. This is the subscription layer.

**S11. RWA Analytics** - tokenized treasuries, commodities, real estate protocols: yields,
backing, flows.

**S12. Wallet Financial Statement (flagship)**
Input: one or more pasted wallet addresses; optional CEX CSV exports (OKX, Binance, Bybit);
optional template selection.

Process:
- Pull multi-chain tx history (start: Ethereum + X Layer; expand chains after).
- Price every tx in USD at time of transaction (CoinGecko historical).
- Self-transfer detection: transfers between user-pasted addresses are internal, never
  income. (Full clustering heuristics later.)
- Classification engine (Claude classifier + rules): CEX withdrawal/deposit, DeFi yield,
  NFT sale, payroll stream, P2P transfer, bridge hop, spending, savings, self-transfer,
  unknown.
- CEX reconciliation: parse uploaded CSVs, match deposits/withdrawals against on-chain, fill
  off-chain gaps, deduplicate, unify.
- Summary financials: monthly income average, income stability score, expense ratio, net
  worth trend, asset allocation.

Output: bank-statement-grade chronological statement (date, counterparty, asset, USD value,
running balance), money-flow Sankey diagram, personal P&L and balance sheet summary,
methodology page, attestation record with verify link.

Templates: visa income certificate (Digital Nomad Visa format), loan application statement,
tax season summary, rental proof of income, freelancer/DAO income verification, personal
finance review.

Integrity rule (hard requirement): present and classify real data only. Never fabricate,
inflate, or optimize figures. Methodology transparency is the product.

**S13. Project Writeup and Proposal Studio** (reuses S3/S4 compute)

Two modes:
- MODE A - Do the assignment: user provides a project brief, raw idea, and/or dataset
  (example: "predictive maintenance on NASA CMAPSS turbofan data, predict remaining useful
  life"). Intake step asks 3-5 targeted questions to collect missing details (objective,
  audience, dataset location, required sections, deadline format). Agent then executes the
  full analysis end to end (fetch, compute via S3/S4 machinery: EDA, modeling, evaluation,
  charts) AND writes the complete writeup.
- MODE B - Write up existing work: user uploads what they already did (notebook, code
  files, results CSVs, screenshots, rough notes, repo link). Agent parses the materials,
  reconstructs the narrative (problem, approach, method, results, limitations), regenerates
  or restyles charts to Qwibi chart standards, and produces the polished writeup. It
  documents what was actually done - it never invents results not in the provided
  materials.

Output formats (user picks one or several per job):
- Project Report: full academic/professional structure - abstract, introduction, data
  description, methodology, results with charts and metrics tables, discussion,
  limitations, conclusion, references. PDF or DOCX.
- Technical Article: blog/Medium-style narrative writeup of the same work - hook intro,
  plain-English method walkthrough, results, lessons learned, what is next. Markdown +
  DOCX. Optional companion X thread draft (hook tweet + 6-10 tweet breakdown) for building
  in public.
- Proposal: forward-looking document for a project not yet done - background, problem
  statement, proposed methodology, timeline, deliverables, budget/resources table. For
  grants, clients, hackathons, academic supervisors. PDF or DOCX.
- Case Study: client-facing before/after format - context, challenge, solution, measurable
  results.

All outputs attested like every other deliverable. Mode A jobs attach the actual analysis
artifacts (cleaned data, model card from S4) alongside the writeup.

## Database schema (Supabase, initial - adjust as needed)

- `users` (via Clerk or Supabase auth)
- `jobs`: id, user_id, service, status, prompt, inputs jsonb, plan jsonb, error, created_at,
  completed_at
- `deliverables`: id, job_id, file_path, file_type, attestation_hash, manifest jsonb,
  created_at
- `wallet_statements`: id, job_id, addresses text[], chain_coverage, period_start,
  period_end, summary jsonb
- `transactions_cache`: address, chain, tx_hash, block_time, direction, counterparty, asset,
  amount, usd_value, classification, source (onchain or cex), raw jsonb
- `schedules`: id, user_id, service, config jsonb, cron, next_run, active

RLS on from day one, tightened per table - no permissive dev policies left in.

## Hard rules

- No unicode dashes (em dash, en dash) anywhere: UI copy, code comments, generated
  documents. Plain hyphens only.
- Every service ends in a downloadable file. No chat-only outputs.
- Read-only access to user databases. Block all non-SELECT statements at the query layer.
- No custody, no trade execution, no transfers. Qwibi analyzes and reports only.
- Financial outputs carry analysis framing, not personalized investment advice.
- User data is sensitive: encrypt at rest (Supabase default), deletion on request, never
  reuse across users.
- Graceful handling of hostile inputs: empty wallets, 100k-tx whale wallets (paginate + cap
  with "statement covers last N transactions" note), spam tokens (filter known spam token
  lists), malformed CSVs.
- Every deliverable footer: Qwibi logo mark, generation timestamp, attestation verify link
  + QR, methodology reference. No blockchain claims anywhere in copy or UI.

## Demo flow to optimize for (the 60-second pitch)

Paste wallet address -> watch job progress -> receive bank-grade financial statement PDF
with Sankey money flow -> click verify link -> see the hosted verification record (hash,
manifest, sources, timestamp). Then: type one prompt -> receive polished research report
PDF. Two flows, both ending in verifiable professional documents.

## Positioning notes

Not "prompt to spreadsheet" (everyone will build that) but "hire a data science team with
one prompt." One agent, one brand, multiple services listed under it on OKX AI. Every
service ends in a polished deliverable: a report, a model, a dashboard, or a working
spreadsheet - never just a chat answer. That is the marketplace fit: clear utility,
measurable time saved.

## Design reference

A visual mockup of deliverable output styling exists at a private claude.ai/design link
(originally titled "Synapse3 Deliverables" - rebrand all visual references to Qwibi). Not
yet pulled into this repo; needs to be shared directly (export/screenshot/paste) since it
sits behind the user's private Claude login.
