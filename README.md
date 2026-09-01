# Qwibi

A single AI agent that operates as a full data and analytics desk: one prompt (plus optional
wallet addresses, files, or DB connections) in, a finished, professional deliverable out. Built
as a Composite x402 merchant for the Algorand Global x402 Challenge.

See [BRIEF.md](./BRIEF.md) for the full build brief (services, schema, hard rules, demo flow).

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind, Supabase (auth/Postgres/storage, RLS from day
one), Claude API (planner/researcher/writer roles), e2b.dev sandboxed Python, Moralis + Dune
(on-chain data), CoinGecko/CoinMarketCap/Finnhub (market data). Deliverables render to
PDF via `@react-pdf/renderer` (pure JS, no headless browser) or XLSX via `exceljs`, depending
on the service - `ComposeResult` carries a generic `{buffer, contentType, extension}`, so
adding a new output format doesn't touch the pipeline. Attestation is off-chain: SHA-256 hash
+ manifest recorded at delivery, checked through a hosted verify page - no blockchain, no
smart contract, no chain of any kind.

## Algorand Global x402 Challenge positioning

Qwibi now enters as a Composite x402 merchant: every paid analyst endpoint under
`/api/x402/*` uses the same Algorand `AVM_ADDRESS`, settles through the GoPlausible
facilitator, and advertises the `x402-global-challenge` tag for Bazaar discovery and
leaderboard attribution. The core pitch is: verified analyst work, paid one request at a time.

Competition launch checklist:

1. Test with `X402_ALGORAND_NETWORK=testnet`, `FACILITATOR_URL=https://facilitator.goplausible.xyz`,
   and a Testnet `AVM_ADDRESS` opted into USDC ASA `10458941`.
2. Confirm an unpaid call to each public x402 route returns `402 Payment Required`.
3. Complete a paid Testnet round trip: request -> payment -> settle -> Qwibi job response.
4. Switch production to `X402_ALGORAND_NETWORK=mainnet`.
5. Set one Mainnet `AVM_ADDRESS` for every endpoint and opt it into USDC ASA `31566704`.
6. Run `npm run x402:check` to confirm the address format, ALGO balance, and USDC opt-in.
7. Deploy on one public HTTPS domain and keep that same payTo/domain pairing through the
   competition so all endpoint volume rolls up into one leaderboard entry.
8. Complete one real Mainnet payment and confirm the endpoint appears in GoPlausible Bazaar
   and the x402 Global Challenge leaderboard.

## Running locally (mock mode - no API keys required)

```bash
npm install
cp .env.example .env.local   # MOCK_MODE=true by default - every adapter uses fixture data
npm run dev
```

You'll need a Supabase project even in mock mode (auth + storage still run for real):

1. Create a project at supabase.com.
2. Run `supabase/migrations/0001_init.sql` then `0002_storage.sql` against it (SQL editor,
   or `supabase db push` if you have the CLI linked).
3. Fill in `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (Project settings -> API).
4. Create a demo user (Authentication -> Users -> Add user, any email/password) and copy its
   UUID into `DEMO_USER_ID` in [lib/demo-user.ts](./lib/demo-user.ts) - `jobs.user_id` is a
   foreign key into `auth.users`, so a real row has to exist there until real auth ships.

Then visit `/run`, pick a service, and submit - all six run end to end in mock mode,
producing a hashed, downloadable deliverable and a `/verify/[jobId]` record. PDF generation
(`lib/pdf/render.ts`) uses `@react-pdf/renderer` - pure JS, identical behavior locally and
on Vercel. (An earlier Puppeteer + `@sparticuz/chromium` approach worked locally but
repeatedly failed on Vercel with a missing shared library error - a known friction point
between that package and Vercel's function bundle size limits - so it was replaced.)

## Status

Live product target: deploy Qwibi on one HTTPS domain, set one Algorand Mainnet `AVM_ADDRESS`
for all `/api/x402/*` endpoints, and drive GoPlausible-settled USDC volume into the x402
Global Challenge leaderboard.

- Landing page: built, matches the QWIBI brand design (nav, hero, service catalog, pipeline,
  attestation moat, flagship wallet statement section, pricing). The service catalog presents
  the 13 services below as 7 marketplace listings - see the mapping table in
  [BRIEF.md](./BRIEF.md#services-13-underlying-pipelines-presented-as-7-marketplace-listings).
- Pipeline (`lib/pipeline`): built - intake, plan, fetch, compute, compose, attest, deliver,
  orchestrated end to end. Fetch dispatches to Gemini (research, grounded via real Google
  Search rather than recalled training knowledge), Dune (on-chain summary stats), and Moralis
  (wallet tx history) based on what the plan asks for; Claude handles planning
  (`planReport`) and final writing (`writeSection`). Compute does classification, USD
  pricing, and financial aggregation for wallet statements. Every deliverable is a real
  downloadable file (PDF or XLSX, per service) before attestation, not an HTML page - the
  SHA-256 hash is over the actual file bytes.

The per-service log below is keyed to the actual `lib/services/*` module names/slugs, not the
7-listing marketing grouping - see [BRIEF.md](./BRIEF.md#services-13-underlying-pipelines-presented-as-7-marketplace-listings)
for how these map onto the marketplace catalog.

- S1 Prompt to Report (`lib/services/s1-prompt-to-report`): working in mock mode via `/run`.
- S2 Prompt to Financial Model (`lib/services/s2-prompt-to-financial-model`): working in mock
  mode via `/run` - a real DCF workbook (`exceljs`) with live cross-sheet formulas, not static
  values (Assumptions -> Projections -> Summary enterprise value). Currently DCF only - BRIEF.md
  also calls for budget forecast, unit economics, and pricing model types, plus scenario
  toggles, none of which exist yet.
- S3 Data Analysis Run (`lib/services/s3-data-analysis-run`): working in mock mode via
  `/run` - paste CSV, get column type detection, numeric stats (mean/std/quartiles),
  IQR-based outlier detection, categorical top-values, Pearson correlations between numeric
  columns, and a cleaned-data sheet, all in one XLSX. No file upload yet (same as S4) - CSV
  is pasted as text. No chart pack yet either (BRIEF.md calls for one) - stats are tabular.
- S4 ML Forecasts (`lib/services/s4-ml-forecasts`): working in mock mode via `/run` - paste
  CSV, auto-selects between a linear trend regression and a moving-average baseline by
  validation MAE on a real held-out split, outputs an XLSX (predictions + plain-English model
  card). Not Prophet/XGBoost as BRIEF.md names (that needs the e2b Python sandbox, not
  wired up yet) - these are genuine from-scratch baselines, not a fixture pretending to be
  a trained model. No file upload yet either - CSV is pasted as text.
- S5 On-chain Analytics (`lib/services/s5-onchain-analytics`): working in mock mode via
  `/run` - holder distribution, whale movements, protocol metrics (Dune adapter).
- S12 Wallet Financial Statement, flagship (`lib/services/s12-wallet-statement`): working in
  mock mode via `/run` - multi-chain tx pull (Moralis), self-transfer detection, rule-based
  classification, USD pricing (CoinGecko), income/expense/stability summary, chronological
  ledger with running balance. Not yet built: CEX CSV upload/reconciliation, the money-flow
  Sankey diagram (BRIEF.md's headline visual - currently just an asset allocation bar), and
  an LLM fallback for transactions the rule-based classifier can't label.
- S6 Market Intelligence (`lib/services/s6-market-intelligence`): working in mock mode via
  `/run` - list crypto symbols and stock tickers, get a timestamped cross-asset brief (price,
  24h change, 24h volume, market cap where available) via new CoinGecko `getMarketSnapshot`
  and Finnhub `getQuote` adapters. Hard-codes BRIEF.md's rule for this service into the
  compose instructions: analysis framing only, never personalized investment advice - the
  document also carries a standing "not investment advice" disclaimer section. No historical
  charting yet (single point-in-time snapshot per asset) and no cross-asset correlation
  beyond a simple average-24h-move dispersion figure.
- S7 Text to SQL (`lib/services/s7-text-to-sql`): working in mock mode via `/run` - ask a
  question in plain English against a built-in 24-row demo orders dataset; a deterministic
  keyword engine (measure: revenue/count/units/average, dimension: region/category/product/
  status/customer, filters, top-N, asc/desc) computes the real answer and reconstructs the
  equivalent SQL for display - no LLM needed for correctness in demo mode. Real mode (paste a
  Postgres connection string, requires `MOCK_MODE=false` and `ANTHROPIC_API_KEY`) introspects
  the live schema, asks Claude to translate the question into SQL, then enforces read-only
  execution before running it: single SELECT/WITH statement only, no semicolon batches, a
  blocklist of data-modifying keywords, `BEGIN TRANSACTION READ ONLY`, a statement timeout,
  and an injected row limit if the query didn't specify one. Output is a PDF with the query,
  a plain-English answer grounded only in the returned rows, a results table, and a simple
  proportional bar chart for two-column grouped results.
- S8 Dashboard and BI Handoff (`lib/services/s8-dashboard-bi`): working in mock mode via
  `/run` - paste CSV data, get a real interactive dashboard (histogram per numeric column,
  a grouped bar chart of numeric totals by the best categorical column, and a time series if
  a date-like column is detected) rendered with an embedded Plotly.js bundle, plus a modeled
  dataset CSV, delivered together as a single zip. No Tableau `.hyper` extract - there is no
  pure-JavaScript path to that proprietary binary format without a native Tableau SDK, so
  this ships the HTML dashboard and a CSV (which PowerBI and most BI tools import directly)
  instead, and says so plainly on the dashboard itself, not just in this file.
- S9 Strategy Backtester (`lib/services/s9-strategy-backtester`): working in mock mode via
  `/run` - paste date,price CSV history and pick a rule (SMA crossover, RSI threshold, or a
  buy-and-hold baseline), get a real single-asset backtest: equity curve, max drawdown,
  annualized Sharpe ratio, win rate, and a trade log, all computed from actual position
  simulation (fully invested/flat, no leverage) over the pasted prices - verified against
  hand-computed values (drawdown, trade P&L, buy-and-hold return all reconcile exactly). Not
  BRIEF.md's "translate plain English to code" - that free-form path isn't safe to execute
  automatically, so this ships a constrained rule picker instead of an NL parser, and always
  reports its overfitting caveats (single in-sample run, fixed unoptimized parameters, no
  transaction costs or slippage modeled) directly in the deliverable, not just in this file.
- S10 Scheduled Agents (`app/api/schedules`, `app/api/cron`): working via `/run` - the
  "Scheduled runs" section at the bottom of the page saves the currently filled-in form as a
  recurring job (daily or weekly) against the `schedules` table that was already in the
  initial migration. `/api/cron` (configured in `vercel.json`, gated by `CRON_SECRET` when
  set) is a Vercel Cron target that finds schedules whose `next_run` has passed and re-runs
  the pipeline for each - verified locally end to end: created a schedule, forced its
  `next_run` into the past directly in Supabase, hit `/api/cron`, confirmed it produced a
  real new job and deliverable and pushed `next_run` forward, then hit it again and confirmed
  it correctly no-ops. Vercel's Hobby tier only fires cron jobs once a day regardless of what
  `vercel.json` requests, so the daily tick just checks which schedules are due - it doesn't
  need to match each schedule's own cadence. Anomaly alerts and any outbound notification
  (email, webhook) are not built - this ships recurring deliverables only, the other half of
  BRIEF.md's "recurring deliverables + anomaly alerts" description.
- S11 RWA Analytics (`lib/services/s11-rwa-analytics`): working in both mock and real mode via
  `/run` - paste a protocol or token address, pick an asset class (tokenized treasury,
  commodity, or real estate), get a PDF with TVL, yield APY, backing ratio, holder count, and
  recent redemption flows. Real mode (`lib/adapters/rwa/real.ts`, gated on `MORALIS_API_KEY`
  like the other on-chain adapters) matches the pasted address against DeFiLlama's public
  RWA-category protocol list (no key required) for real TVL and yield APY, and Moralis for
  real holder counts (EVM chains only - unsupported chains report `0`, not a guess) -
  verified against Tether Gold, Ondo Yield Assets, and RealT Tokens, each returning real,
  correct figures. Backing ratio and redemption flows have no generic public source (each
  issuer publishes this differently, if at all) and are always reported as unavailable
  (`0` / empty), never fabricated - the PDF says so directly. An address DeFiLlama doesn't
  track falls back to the existing mock generator for that one request, clearly labeled via
  a `dataSource` field rather than failing the job, since every service must still end in a
  downloadable deliverable.
- S13 Project Writeup and Proposal Studio (`lib/services/s13-writeup-studio`): working in
  mock mode via `/run` - two modes (do the assignment / write up existing work) x four output
  formats (project report, technical article, proposal, case study). Mode A reuses S3's
  stats functions and S4's forecast engine directly (not through their pipeline services -
  their exported pure functions) to ground the writeup in real computed figures; Mode B
  grounds every section in the user's pasted notes via the same `writeSection` context
  mechanism used for research citations elsewhere, with an explicit "never invent a result
  not in the notes" instruction. When CSV data is provided (either mode), the deliverable is
  a zip bundling the PDF writeup with an XLSX analysis appendix (stats table, and a forecast
  table if a target column was given) - verified by hand-checking the computed mean and
  forecast values against the input series. No DOCX or Markdown export (PDF only, despite
  BRIEF.md naming DOCX/Markdown for some formats) and no notebook/code/screenshot/repo-link
  parsing for Mode B - paste your notes as text instead. The "asks 3-5 targeted questions"
  intake step from BRIEF.md is also not built - those fields (objective, audience, required
  sections) are just upfront form fields instead of a conversational back-and-forth, matching
  every other service's single-shot form.
- S14 Data Clean and Structure (`lib/services/s14-data-clean`): working in mock mode via
  `/run` - three input sources (messy CSV/Excel paste, an on-chain address reusing the
  existing Moralis + CoinGecko layer, or a raw JSON dump with automatic nested-object
  flattening), one XLSX output with a Cleaned Data sheet and a Data Quality Report sheet
  (rows in/out, duplicates removed, per-column detected type, and every flagged row with its
  reason - flagged, never silently dropped or guessed at, per the hard requirement this
  service was built around). Real, deterministic cleaning: header normalization, currency/
  percent/accounting-format numeric parsing, date-format detection (defaults ambiguous
  DD/MM-vs-MM/DD dates to MM/DD unless the day value makes that impossible - a documented,
  unresolvable limitation without format metadata the CSV doesn't carry), duplicate-row
  removal, a mechanical (not guessed) fix for the most common UTF-8-as-Latin-1 mojibake
  pattern, and optional schema mapping when a target column list is given. Two real bugs
  were caught and fixed during verification: `Date.parse`'s locale/timezone-dependent
  fallback was silently shifting MM/DD/YYYY dates by a day, and misclassifying bare 4-digit
  numbers (like a $3,520 USD value) as years; both are covered by explicit, timezone-free
  parsing now. A malformed CSV row (an unquoted comma inside a field) is flagged with its
  exact field-count mismatch rather than silently shifting every value after it into the
  wrong column. Explicitly out of scope, matching the brief: no ETL orchestration, no
  scheduled jobs (S10 already covers recurring runs), and no optional Supabase table load -
  dynamically creating per-user tables from arbitrary cleaned data needs careful schema and
  security design beyond this pass, so it's not built.
- Auth: not started - pipeline runs against a fixed `DEMO_USER_ID` for now. This is acceptable
  for a public paid endpoint demo, but a full multi-tenant Qwibi product should add real auth.

## Going live (`MOCK_MODE=false`) checklist

5 of 6 real-mode adapters (anthropic, dune, moralis, coingecko, stockquote) plus the new
google adapter are fully symmetric mock/real pairs already gated by `lib/adapters/mode.ts`'s
`resolveMode()` - going live needs env vars filled into `.env.local` only, no code changes.
Sign up roughly in this order:

1. **Supabase** - already required even in mock mode (auth/storage), nothing new here.
2. **Anthropic** (`ANTHROPIC_API_KEY`) - Anthropic Console, pay-as-you-go, no free tier but
   low friction. Still used for job planning and final section writing.
3. **Google Gemini** (`GEMINI_API_KEY`) - Google AI Studio, free tier available. Powers
   grounded research (real Google Search results, not Claude's recalled training knowledge).
   Watch for free-tier rate limits: `lib/pipeline/stages/fetch.ts` fires one Gemini call per
   research query concurrently via `Promise.all` - if 429s show up in practice, that call may
   need to serialize.
4. **CoinGecko** (`COINGECKO_API_KEY`) and **Finnhub** (`FINNHUB_API_KEY`) - both free-tier,
   needed for Market Intelligence (S6) and price lookups used by S12/S9/etc. Finnhub replaced
   Alpha Vantage after its 25-request/day free quota blocked real-mode testing; Finnhub's free
   tier (60 calls/minute) has no such daily cap.
5. **Moralis** (`MORALIS_API_KEY`) - free tier, needed for wallet tx history (S12 flagship,
   S14's on-chain source path).
6. **Dune** (`DUNE_API_KEY` plus `DUNE_QUERY_ID_HOLDERS`/`DUNE_QUERY_ID_WHALES`/
   `DUNE_QUERY_ID_PROTOCOL`) - the highest-friction item: needs an account/key **and** hand-
   authoring 3 SQL queries on dune.com (each taking a `token_address` parameter) before the
   query ids even exist to paste into `.env.local`. Budget real time for this one.
7. **Not required**: `E2B_API_KEY` is documented and the package is installed, but no service
   actually calls it yet (S3/S4 use local pure computation, not the sandbox) - setting it has
   zero effect today. RWA (S11's adapter) has nothing to sign up for; it's mock-only by
   design, with no real data source to fall back to.
