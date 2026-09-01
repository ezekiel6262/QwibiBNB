import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResearchSnippet } from "@/lib/pipeline/types";
import type { RwaMetrics } from "@/lib/adapters/rwa";
import { PdfLogo } from "@/lib/pdf/PdfLogo";
import { PDF_COLORS } from "@/lib/pdf/theme";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: PDF_COLORS.ink },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 28 },
  wordmark: { fontSize: 12, fontWeight: 700, letterSpacing: 0.5 },
  tag: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted, marginLeft: "auto" },
  eyebrow: {
    fontFamily: "Courier",
    fontSize: 9,
    color: PDF_COLORS.accent,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 22 },
  sectionHeading: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  sectionBody: { fontSize: 10.5, lineHeight: 1.6, color: PDF_COLORS.body, marginBottom: 18 },
  statRow: { flexDirection: "row", gap: 32, marginBottom: 18, flexWrap: "wrap" },
  statLabel: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  statValue: { fontSize: 15, fontWeight: 700 },
  statValueAccent: { fontSize: 15, fontWeight: 700, color: PDF_COLORS.accent },
  redemptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 6,
    fontSize: 10,
  },
  divider: { borderTop: `0.5px solid ${PDF_COLORS.border}`, marginTop: 16, paddingTop: 12 },
  label: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sourceItem: { fontSize: 9.5, color: PDF_COLORS.secondary, marginBottom: 3 },
  methodology: { fontSize: 9, color: PDF_COLORS.secondary, lineHeight: 1.5 },
  footerRow: {
    borderTop: `0.5px solid ${PDF_COLORS.border}`,
    marginTop: 24,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted },
  footerLink: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.accent },
});

function usd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function truncateAddress(address: string): string {
  return address.length > 14 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

const ASSET_CLASS_LABELS: Record<RwaMetrics["assetClass"], string> = {
  treasury: "Tokenized treasury",
  commodity: "Tokenized commodity",
  real_estate: "Tokenized real estate",
};

export function RwaReportDocument(props: {
  protocolAddress: string;
  summary: string;
  metrics: RwaMetrics;
  sources: ResearchSnippet[];
  jobId: string;
}) {
  const { protocolAddress, summary, metrics, sources, jobId } = props;
  const uniqueSources = Array.from(new Set(sources.map((s) => s.source)));
  const preparedAt = new Date().toISOString();

  return (
    <Document title={`RWA analytics: ${metrics.protocolName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <PdfLogo size={14} />
          <Text style={styles.wordmark}>QWIBI</Text>
          <Text style={styles.tag}>RWA ANALYTICS - S11</Text>
        </View>

        <Text style={styles.eyebrow}>
          {ASSET_CLASS_LABELS[metrics.assetClass]} - {truncateAddress(protocolAddress)} - data as
          of {preparedAt.slice(0, 10)}
        </Text>
        <Text style={styles.title}>{metrics.protocolName}</Text>

        <View>
          <Text style={styles.sectionHeading}>Executive summary</Text>
          <Text style={styles.sectionBody}>{summary}</Text>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Yield and backing</Text>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>TVL</Text>
              <Text style={styles.statValue}>{usd(metrics.totalValueLockedUsd)}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Yield (APY)</Text>
              <Text style={styles.statValueAccent}>{metrics.yieldApyPct}%</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Backing ratio</Text>
              <Text style={styles.statValue}>{metrics.backingRatioPct}%</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Holders</Text>
              <Text style={styles.statValue}>{metrics.holderCount.toLocaleString("en-US")}</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Redemption flows</Text>
          {metrics.redemptions.length === 0 ? (
            <Text style={styles.sectionBody}>
              Not available - no generic public source reports per-protocol redemption
              history, so this is left empty rather than invented. See Methodology.
            </Text>
          ) : (
            metrics.redemptions.map((r) => (
              <View key={r.date} style={styles.redemptionRow}>
                <Text style={{ color: PDF_COLORS.body }}>{r.date}</Text>
                <Text style={{ fontWeight: 700 }}>{usd(r.amountUsd)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.divider}>
          <Text style={styles.label}>Sources</Text>
          {uniqueSources.map((s) => (
            <Text key={s} style={styles.sourceItem}>
              {s}
            </Text>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            {metrics.dataSource === "live"
              ? "TVL and yield are pulled from DeFiLlama's public RWA-category data, and " +
                "holder count from Moralis, for the address matched to this address (EVM " +
                "chains only - some chains do not support a holder-count lookup, shown as " +
                "0 rather than guessed). Backing ratio and redemption flows are not " +
                "available from any generic public source - each issuer publishes this " +
                "differently, if at all - so both are left at 0 / empty rather than " +
                "invented. Narrative sections only interpret the figures above."
              : "This address was not found among DeFiLlama's tracked tokenized RWA " +
                "protocols, so the figures below are illustrative fixture data, not a " +
                "live figure for this specific address. Tokenized treasury, commodity, " +
                "and real estate protocols each publish yield, backing, and redemption " +
                "data differently, if at all - there is no single canonical RWA data " +
                "source the way there is for on-chain token analytics."}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Prepared {preparedAt}</Text>
          <Link src={`/verify/${jobId}`} style={styles.footerLink}>
            Verify at /verify/{jobId}
          </Link>
        </View>
      </Page>
    </Document>
  );
}
