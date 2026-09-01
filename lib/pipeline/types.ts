export type JobStatus =
  | "queued"
  | "planning"
  | "fetching"
  | "computing"
  | "composing"
  | "attesting"
  | "delivered"
  | "failed";

export type JobRecord = {
  id: string;
  userId: string;
  service: string;
  status: JobStatus;
  prompt: string | null;
  inputs: Record<string, unknown>;
  plan: PlanResult | null;
  error: string | null;
};

export type OnchainTask = {
  kind: "holders" | "whales" | "protocol";
  tokenAddress: string;
};

export type PlanResult = {
  outline: { id: string; heading: string }[];
  researchQueries: string[];
  onchainTasks: OnchainTask[];
  walletAddresses: string[];
  composeInstructions: string;
};

export type ResearchSnippet = {
  id: string;
  source: string;
  text: string;
};

export type ComputedFact = {
  label: string;
  value: string;
};

export type HolderDistribution = {
  totalHolders: number;
  top10Pct: number;
  cohorts: { label: string; pctOfSupply: number }[];
};

export type WhaleMovement = {
  txHash: string;
  from: string;
  to: string;
  amountUsd: number;
  timestamp: string;
};

export type ProtocolMetrics = {
  tvlUsd: number;
  dexVolume24hUsd: number;
  revenue30dUsd: number;
};

export type OnchainData = {
  holders?: HolderDistribution;
  whales?: WhaleMovement[];
  protocol?: ProtocolMetrics;
};

export type RawTransaction = {
  txHash: string;
  chain: string;
  address: string;
  direction: "in" | "out";
  counterparty: string;
  asset: string;
  amount: number;
  timestamp: string;
};

export type TransactionClassification =
  | "self_transfer"
  | "cex_deposit"
  | "cex_withdrawal"
  | "defi_yield"
  | "nft_sale"
  | "bridge"
  | "p2p_transfer"
  | "spending"
  | "unknown";

export type ClassifiedTransaction = RawTransaction & {
  usdValue: number;
  classification: TransactionClassification;
  runningBalanceUsd: number;
};

export type WalletStatementSummary = {
  monthlyIncomeAvgUsd: number;
  incomeStabilityScore: number;
  expenseRatio: number;
  netWorthTrendPct: number;
  totalIncomeUsd: number;
  totalExpenseUsd: number;
  assetAllocation: { asset: string; pctOfHoldings: number }[];
};

export type StageContext = {
  job: JobRecord;
  plan: PlanResult;
  research: ResearchSnippet[];
  computed: ComputedFact[];
  onchain: OnchainData;
  transactions: ClassifiedTransaction[];
  walletSummary: WalletStatementSummary | null;
};

export type DeliverableFile = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

export type ComposeResult = {
  title: string;
  file: DeliverableFile;
};

export type ServiceModule = {
  id: string;
  label: string;
  usesOnchainData?: boolean;
  validateInputs(inputs: unknown): Record<string, unknown> & { prompt: string };
  compose(ctx: StageContext): Promise<ComposeResult>;
};

export type DeliverableRecord = {
  id: string;
  jobId: string;
  filePath: string;
  fileType: string;
  attestationHash: string;
  manifest: Record<string, unknown>;
};
