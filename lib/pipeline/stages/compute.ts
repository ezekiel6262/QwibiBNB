import { coingecko } from "@/lib/adapters/coingecko";
import { KNOWN_COUNTERPARTIES } from "@/lib/pipeline/known-counterparties";
import type {
  ClassifiedTransaction,
  ComputedFact,
  RawTransaction,
  TransactionClassification,
  WalletStatementSummary,
} from "@/lib/pipeline/types";

/**
 * Rule-based classifier: self-transfer detection against the user's own pasted addresses,
 * then a lookup against the known-counterparty label table. Addresses outside that table
 * fall back to a direction-based guess (in = p2p_transfer, out = spending). A real system
 * would route the fallback case through the Claude classifier for ambiguous cases - not
 * implemented yet, see BRIEF.md status.
 */
function classify(tx: RawTransaction, userAddresses: string[]): TransactionClassification {
  const counterparty = tx.counterparty.toLowerCase();
  if (userAddresses.some((a) => a.toLowerCase() === counterparty)) return "self_transfer";

  const kind = KNOWN_COUNTERPARTIES[counterparty];
  if (kind === "cex") return tx.direction === "in" ? "cex_withdrawal" : "cex_deposit";
  if (kind === "bridge") return "bridge";
  if (kind === "defi") return "defi_yield";
  if (kind === "nft") return "nft_sale";

  return tx.direction === "in" ? "p2p_transfer" : "spending";
}

function summarize(transactions: ClassifiedTransaction[]): WalletStatementSummary {
  const nonInternal = transactions.filter((t) => t.classification !== "self_transfer");
  const totalIncomeUsd = nonInternal
    .filter((t) => t.direction === "in")
    .reduce((sum, t) => sum + t.usdValue, 0);
  const totalExpenseUsd = nonInternal
    .filter((t) => t.direction === "out")
    .reduce((sum, t) => sum + t.usdValue, 0);

  const monthlyIncome = new Map<string, number>();
  for (const t of nonInternal.filter((t) => t.direction === "in")) {
    const month = t.timestamp.slice(0, 7);
    monthlyIncome.set(month, (monthlyIncome.get(month) ?? 0) + t.usdValue);
  }
  const months = Array.from(monthlyIncome.values());
  const monthlyIncomeAvgUsd = months.length ? months.reduce((s, v) => s + v, 0) / months.length : 0;
  const variance = months.length
    ? months.reduce((s, v) => s + (v - monthlyIncomeAvgUsd) ** 2, 0) / months.length
    : 0;
  const coefficientOfVariation = monthlyIncomeAvgUsd > 0 ? Math.sqrt(variance) / monthlyIncomeAvgUsd : 1;
  const incomeStabilityScore = Math.round(Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100)));

  const expenseRatio =
    totalIncomeUsd > 0 ? Math.round((totalExpenseUsd / totalIncomeUsd) * 100) / 100 : 0;
  const netWorthTrendPct =
    totalIncomeUsd > 0
      ? Math.round(((totalIncomeUsd - totalExpenseUsd) / totalIncomeUsd) * 1000) / 10
      : 0;

  const holdingsByAsset = new Map<string, number>();
  for (const t of nonInternal) {
    const signed = t.direction === "in" ? t.usdValue : -t.usdValue;
    holdingsByAsset.set(t.asset, (holdingsByAsset.get(t.asset) ?? 0) + signed);
  }
  const totalAbsHoldings = Array.from(holdingsByAsset.values()).reduce(
    (sum, v) => sum + Math.abs(v),
    0
  );
  const assetAllocation = Array.from(holdingsByAsset.entries())
    .map(([asset, value]) => ({
      asset,
      pctOfHoldings: totalAbsHoldings > 0 ? Math.round((Math.abs(value) / totalAbsHoldings) * 100) : 0,
    }))
    .sort((a, b) => b.pctOfHoldings - a.pctOfHoldings);

  return {
    monthlyIncomeAvgUsd,
    incomeStabilityScore,
    expenseRatio,
    netWorthTrendPct,
    totalIncomeUsd,
    totalExpenseUsd,
    assetAllocation,
  };
}

export async function compute(args: {
  rawTransactions: RawTransaction[];
  userAddresses: string[];
}): Promise<{
  computed: ComputedFact[];
  transactions: ClassifiedTransaction[];
  walletSummary: WalletStatementSummary | null;
}> {
  if (args.rawTransactions.length === 0) {
    return { computed: [], transactions: [], walletSummary: null };
  }

  const priced = await Promise.all(
    args.rawTransactions.map(async (tx) => ({
      tx,
      usdValue: tx.amount * (await coingecko.getHistoricalPriceUsd(tx.asset, tx.timestamp)),
    }))
  );

  const sorted = priced
    .map(({ tx, usdValue }) => ({ tx, usdValue, classification: classify(tx, args.userAddresses) }))
    .sort((a, b) => new Date(a.tx.timestamp).getTime() - new Date(b.tx.timestamp).getTime());

  let runningBalance = 0;
  const transactions: ClassifiedTransaction[] = sorted.map(({ tx, usdValue, classification }) => {
    const signedUsd =
      classification === "self_transfer" ? 0 : tx.direction === "in" ? usdValue : -usdValue;
    runningBalance += signedUsd;
    return { ...tx, usdValue, classification, runningBalanceUsd: runningBalance };
  });

  return { computed: [], transactions, walletSummary: summarize(transactions) };
}
