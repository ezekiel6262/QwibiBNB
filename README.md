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
- BSC mainnet for production commerce
- A dedicated encrypted production wallet under `qwibibnbagent/.studio/wallets/`

Signing and pricing remain deterministic fixed code. The LLM can use read-only chain tools, but it never receives a signing or settlement tool and never chooses prices.

## Current mainnet pricing

- ERC-8183 list price: `0.1 U` per job
- ERC-8183 maximum price clamp: `1 U`
- x402/B402 price: `$0.01` per request
- Automatic wallet top-up: disabled

Automatic wallet top-up remains disabled; all signing and spending boundaries are explicit.

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

The production runtime is deployed in the operator's AWS account. Its encrypted keystore, wallet password, and Pieverse key are delivered through AWS Secrets Manager and are excluded from the code bundle.

## Live BNB mainnet agent

- A2A invoke: AWS Bedrock AgentCore with Cognito client-credentials authentication
- Public MCP: `https://l6ipz8ltz1.execute-api.us-east-1.amazonaws.com/mcp`
- x402: dormant until production B402 merchant credentials and a public payment gateway are provisioned
- ERC-8004 agent ID: `327090` on BSC mainnet
- Runtime: AWS Bedrock AgentCore in `us-east-1`
- Mainnet wallet: `0x4d09aF0beAC3f65c5bDbF1d19F31caCa7924B7ec`

## Deployment sequence

1. Set `WALLET_PASSWORD` privately in `qwibibnbagent/.studio/.env.local`.
2. Create the dedicated mainnet wallet with `bag wallet new`.
3. Activate the default Pieverse `auto/free` model.
4. Run `bag doctor` and local A2A/MCP smoke tests.
5. Configure the AWS account, region, durable storage, and least-privilege deployment identity.
6. Run `bag deploy prepare --provider aws`.
7. Deploy with `bag deploy --provider aws --secrets-mode secretsmanager`.
8. Verify the live endpoint and reconcile the ERC-8004 identity.
9. Publish the deployed HTTPS endpoints in the agent metadata.
10. List the verified MCP or x402 endpoint on YellowCrab.

Paid x402 activation additionally requires a separate B402 production merchant application for this exact agent wallet and environment. Sandbox and production credentials must never be reused across wallets or networks.

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
