# QwibiBNB

QwibiBNB is the BNB Chain edition of Qwibi: an autonomous AI data and analytics desk that can be hired by agents through ERC-8183 jobs or paid per request through x402/B402.

This repository is intentionally isolated from other chain editions. It has its own Git history, deployment state, wallet, payment credentials, and runtime configuration.

## What Qwibi sells

- Market and competitive intelligence
- Wallet and on-chain activity analysis
- Financial models, forecasts, and scenario analysis
- Data cleaning and data-quality reports
- Safe read-only text-to-SQL analysis
- Strategy backtests with explicit limitations
- Professional reports, proposals, and case studies

## Architecture

The repository contains two separate applications:

- The root Next.js application is Qwibi's product UI and analytics pipeline.
- `qwibibnbagent/` is the BNB Agent Studio seller runtime. It is the only on-chain signer and exposes A2A, MCP, and `/x402` from one process.

The Studio runtime uses:

- ERC-8004 for agent identity
- ERC-8183 for escrowed jobs
- B402-backed x402 for pay-per-request work
- BSC testnet during launch validation
- A dedicated encrypted throwaway wallet under `qwibibnbagent/.studio/wallets/`

Signing and pricing remain deterministic fixed code. The LLM can use read-only chain tools, but it never receives a signing or settlement tool and never chooses prices.

## Current testnet pricing

- ERC-8183 list price: `0.1 U` per job
- ERC-8183 maximum price clamp: `1 U`
- x402/B402 price: `$0.01` per request
- Automatic wallet top-up: disabled

These are testnet launch defaults, not a final production pricing decision.

## Local product application

```bash
npm install
copy .env.example .env.local
npm run dev
```

Use a separate Supabase project for this BNB edition. Never reuse another chain edition's service-role key, storage bucket, demo user, wallet credentials, or deployment linkage.

## BNB Agent Studio runtime

Requirements: Node.js 22+, pnpm 10, and Bun 1.3+ for deployment.

```bash
cd qwibibnbagent
pnpm install
bag doctor
bag dev
```

The generated runtime keeps secrets in `qwibibnbagent/.studio/.env.local`, which is gitignored. Never pass `WALLET_PASSWORD`, B402 credentials, or private key material through command arguments or commit them.

The managed BNB trial is a temporary 48-hour BSC testnet environment. It requires a new throwaway wallet because its testnet signing material is transmitted to the platform operator's managed secret store during deployment. The trial clock starts on the first successful deploy.

## Live BNB testnet agent

- A2A card: `https://bnbagent-api.bnbchain.world/v1/rt/01M1DKG8MKDB3N17RTMRYDQ9XA/.well-known/agent-card.json`
- A2A invoke: `https://bnbagent-api.bnbchain.world/v1/rt/01M1DKG8MKDB3N17RTMRYDQ9XA/a2a`
- MCP: `https://bnbagent-api.bnbchain.world/v1/rt/01M1DKG8MKDB3N17RTMRYDQ9XA/mcp`
- x402: `https://bnbagent-api.bnbchain.world/v1/rt/01M1DKG8MKDB3N17RTMRYDQ9XA/x402` (dormant until B402 sandbox merchant credentials are provisioned)
- Trial expiry: `2026-09-03T04:15:05Z`

## Deployment sequence

1. Set `WALLET_PASSWORD` privately in `qwibibnbagent/.studio/.env.local`.
2. Create the throwaway testnet wallet with `bag wallet new`.
3. Activate the default Pieverse `auto/free` model.
4. Run `bag doctor` and local A2A/MCP smoke tests.
5. Authenticate with `bag platform login`.
6. Run `bag deploy prepare --provider bnb --backend aws`.
7. Deploy with `bag deploy --provider bnb`.
8. Verify the live endpoint and reconcile the ERC-8004 identity.
9. Publish the deployed HTTPS endpoints in the agent metadata.
10. List the verified MCP or x402 endpoint on YellowCrab.

Paid x402 activation additionally requires a separate B402 sandbox merchant application for this exact agent wallet and environment. Sandbox and production credentials must never be reused across wallets or networks.

## Verification

```bash
npm run typecheck
npm run build

cd qwibibnbagent
pnpm --filter qwibibnbagent-agent typecheck
pnpm --filter qwibibnbagent-agent build
bag doctor
```

The public repository contains source and public deployment metadata only. Local environment files, wallet keystores, B402 keys, generated reports, datasets, build output, and private cloud linkage are excluded.
