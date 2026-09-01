import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import type {
  ClassifiedTransaction,
  TransactionClassification,
  WalletStatementSummary,
} from "@/lib/pipeline/types";
import { PdfLogo } from "@/lib/pdf/PdfLogo";
import { PDF_COLORS } from "@/lib/pdf/theme";

export const TEMPLATE_LABELS: Record<string, string> = {
  visa_income: "Digital nomad visa income certificate",
  loan_application: "Loan application statement",
  tax_summary: "Tax season summary",
  rental_proof: "Rental proof of income",
  freelancer_income: "Freelancer / DAO income verification",
  personal_review: "Personal finance review",
};

const CLASSIFICATION_LABELS: Record<TransactionClassification, string> = {
  self_transfer: "Self transfer",
  cex_deposit: "CEX deposit",
  cex_withdrawal: "CEX withdrawal",
  defi_yield: "DeFi yield",
  nft_sale: "NFT sale",
  bridge: "Bridge",
  p2p_transfer: "P2P transfer",
  spending: "Spending",
  unknown: "Unknown",
};

const styles = StyleSheet.create({
  page: { padding: 44, fontFamily: "Helvetica", fontSize: 10, color: PDF_COLORS.ink },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 24 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { fontSize: 12, fontWeight: 700, letterSpacing: 0.5 },
  tag: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted, marginLeft: "auto" },
  eyebrow: {
    fontFamily: "Courier",
    fontSize: 9,
    color: PDF_COLORS.accent,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  addresses: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted, marginBottom: 18 },
  kpiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5px solid ${PDF_COLORS.border}`,
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 12,
    marginBottom: 18,
  },
  kpiLabel: {
    fontFamily: "Courier",
    fontSize: 7.5,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  kpiValue: { fontSize: 14, fontWeight: 700 },
  kpiValueAccent: { fontSize: 14, fontWeight: 700, color: PDF_COLORS.accent },
  sectionHeading: { fontSize: 12, fontWeight: 700, marginBottom: 6 },
  sectionBody: { fontSize: 10, lineHeight: 1.55, color: PDF_COLORS.body, marginBottom: 16 },
  allocationRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  allocationAsset: { width: 50, fontSize: 9, color: PDF_COLORS.body },
  allocationTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#f3f4f6",
  },
  allocationFill: { height: "100%", backgroundColor: PDF_COLORS.accent },
  allocationPct: { width: 30, fontSize: 9, color: PDF_COLORS.muted, textAlign: "right" },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingBottom: 5,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `0.5px solid #f3f4f6`,
    paddingVertical: 4,
  },
  th: {
    fontFamily: "Courier",
    fontSize: 7,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
  },
  colDate: { width: "14%" },
  colCounterparty: { width: "20%" },
  colClass: { width: "20%" },
  colAmount: { width: "18%", textAlign: "right" },
  colUsd: { width: "14%", textAlign: "right" },
  colBalance: { width: "14%", textAlign: "right" },
  tdMono: { fontFamily: "Courier", fontSize: 8 },
  td: { fontSize: 8.5, color: PDF_COLORS.body },
  divider: { borderTop: `0.5px solid ${PDF_COLORS.border}`, marginTop: 14, paddingTop: 10 },
  label: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  methodology: { fontSize: 9, color: PDF_COLORS.secondary, lineHeight: 1.5 },
  footerRow: {
    borderTop: `0.5px solid ${PDF_COLORS.border}`,
    marginTop: 20,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted },
  footerLink: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.accent },
});

function usd(value: number): string {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString("en-US")}`;
}

function truncateAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export function WalletStatementDocument(props: {
  addresses: string[];
  template: string;
  narrative: string;
  summary: WalletStatementSummary | null;
  transactions: ClassifiedTransaction[];
  jobId: string;
}) {
  const preparedAt = new Date().toISOString();
  const templateLabel = TEMPLATE_LABELS[props.template] ?? TEMPLATE_LABELS.personal_review;
  const s = props.summary;

  return (
    <Document title="Wallet financial statement">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <PdfLogo size={14} />
            <Text style={styles.wordmark}>QWIBI</Text>
          </View>
          <Text style={styles.tag}>WALLET STATEMENT - S12</Text>
        </View>

        <Text style={styles.eyebrow}>Template: {templateLabel}</Text>
        <Text style={styles.title}>Wallet financial statement</Text>
        <Text style={styles.addresses}>
          {props.addresses.map(truncateAddress).join(", ")}
        </Text>

        <View style={styles.kpiRow}>
          <View>
            <Text style={styles.kpiLabel}>Monthly income avg</Text>
            <Text style={styles.kpiValue}>{usd(s?.monthlyIncomeAvgUsd ?? 0)}</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>Stability score</Text>
            <Text style={styles.kpiValueAccent}>{s?.incomeStabilityScore ?? 0}/100</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>Expense ratio</Text>
            <Text style={styles.kpiValue}>{s?.expenseRatio ?? 0}</Text>
          </View>
          <View>
            <Text style={styles.kpiLabel}>Net worth trend</Text>
            <Text style={styles.kpiValue}>
              {(s?.netWorthTrendPct ?? 0) >= 0 ? "+" : ""}
              {s?.netWorthTrendPct ?? 0}%
            </Text>
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Executive summary</Text>
          <Text style={styles.sectionBody}>{props.narrative}</Text>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Asset allocation</Text>
          <View style={{ marginBottom: 16 }}>
            {(s?.assetAllocation ?? []).length ? (
              s!.assetAllocation.map((a) => (
                <View key={a.asset} style={styles.allocationRow}>
                  <Text style={styles.allocationAsset}>{a.asset}</Text>
                  <View style={styles.allocationTrack}>
                    <View style={[styles.allocationFill, { width: `${a.pctOfHoldings}%` }]} />
                  </View>
                  <Text style={styles.allocationPct}>{a.pctOfHoldings}%</Text>
                </View>
              ))
            ) : (
              <Text style={{ fontSize: 9, color: PDF_COLORS.muted }}>
                No holdings to allocate.
              </Text>
            )}
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Transaction history</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colCounterparty]}>Counterparty</Text>
            <Text style={[styles.th, styles.colClass]}>Classification</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount</Text>
            <Text style={[styles.th, styles.colUsd]}>USD</Text>
            <Text style={[styles.th, styles.colBalance]}>Balance</Text>
          </View>
          {props.transactions.length ? (
            props.transactions.map((t) => (
              <View key={t.txHash} style={styles.tableRow} wrap={false}>
                <Text style={[styles.tdMono, styles.colDate]}>{t.timestamp.slice(0, 10)}</Text>
                <Text style={[styles.tdMono, styles.colCounterparty]}>
                  {truncateAddress(t.counterparty)}
                </Text>
                <Text style={[styles.td, styles.colClass]}>
                  {CLASSIFICATION_LABELS[t.classification]}
                </Text>
                <Text style={[styles.td, styles.colAmount]}>
                  {t.amount} {t.asset}
                </Text>
                <Text
                  style={[
                    styles.td,
                    styles.colUsd,
                    { color: t.direction === "in" ? PDF_COLORS.green : PDF_COLORS.body },
                  ]}
                >
                  {t.direction === "in" ? "+" : "-"}
                  {usd(t.usdValue)}
                </Text>
                <Text style={[styles.td, styles.colBalance, { fontWeight: 700 }]}>
                  {usd(t.runningBalanceUsd)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 9, color: PDF_COLORS.muted, paddingVertical: 8 }}>
              No transactions in the observed window.
            </Text>
          )}
        </View>

        <View style={styles.divider}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            Transfers between the addresses listed above are classified as self transfers
            and excluded from income and expense totals. Every other figure traces to an
            on-chain transaction, priced in USD at time of transfer. No figures are
            fabricated, inflated, or optimized. This document is hashed at delivery and the
            record is checkable independently of this file.
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Prepared {preparedAt}</Text>
          <Link src={`/verify/${props.jobId}`} style={styles.footerLink}>
            Verify at /verify/{props.jobId}
          </Link>
        </View>
      </Page>
    </Document>
  );
}
