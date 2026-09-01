import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import type { OnchainData, ResearchSnippet } from "@/lib/pipeline/types";
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
  statRow: { flexDirection: "row", gap: 32, marginBottom: 10 },
  statLabel: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  statValue: { fontSize: 15, fontWeight: 700 },
  statValueAccent: { fontSize: 15, fontWeight: 700, color: PDF_COLORS.accent },
  cohortRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 5,
    fontSize: 10,
  },
  whaleRow: {
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 6,
  },
  whaleTop: { flexDirection: "row", justifyContent: "space-between" },
  whaleAddr: { fontFamily: "Courier", fontSize: 9 },
  whaleAmt: { fontSize: 10, fontWeight: 700 },
  whaleTime: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted, marginTop: 2 },
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

export function OnchainReportDocument(props: {
  tokenAddress: string;
  summary: string;
  onchain: OnchainData;
  sources: ResearchSnippet[];
  jobId: string;
}) {
  const uniqueSources = Array.from(new Set(props.sources.map((s) => s.source)));
  const preparedAt = new Date().toISOString();
  const { holders, whales, protocol } = props.onchain;

  return (
    <Document title={`On-chain analytics: ${props.tokenAddress}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <PdfLogo size={14} />
          <Text style={styles.wordmark}>QWIBI</Text>
          <Text style={styles.tag}>ON-CHAIN ANALYTICS - S5</Text>
        </View>

        <Text style={styles.eyebrow}>
          {truncateAddress(props.tokenAddress)} - data as of {preparedAt.slice(0, 10)}
        </Text>
        <Text style={styles.title}>Holder structure and flows</Text>

        <View>
          <Text style={styles.sectionHeading}>Executive summary</Text>
          <Text style={styles.sectionBody}>{props.summary}</Text>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Holder structure</Text>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>Total holders</Text>
              <Text style={styles.statValue}>
                {(holders?.totalHolders ?? 0).toLocaleString("en-US")}
              </Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Top 10 concentration</Text>
              <Text style={styles.statValueAccent}>{holders?.top10Pct ?? 0}%</Text>
            </View>
          </View>
          <View style={{ marginBottom: 18 }}>
            {(holders?.cohorts ?? []).map((c) => (
              <View key={c.label} style={styles.cohortRow}>
                <Text style={{ color: PDF_COLORS.body }}>{c.label}</Text>
                <Text style={{ fontWeight: 700 }}>{c.pctOfSupply}%</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionHeading}>Whale movements</Text>
          {whales?.length ? (
            <View style={{ marginBottom: 18 }}>
              {whales.map((w) => (
                <View key={w.txHash} style={styles.whaleRow}>
                  <View style={styles.whaleTop}>
                    <Text style={styles.whaleAddr}>
                      {truncateAddress(w.from)} to {truncateAddress(w.to)}
                    </Text>
                    <Text style={styles.whaleAmt}>{usd(w.amountUsd)}</Text>
                  </View>
                  <Text style={styles.whaleTime}>{w.timestamp}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 10, color: PDF_COLORS.muted, marginBottom: 18 }}>
              No large transfers in the observed window.
            </Text>
          )}
        </View>

        <View>
          <Text style={styles.sectionHeading}>Protocol metrics</Text>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.statLabel}>TVL</Text>
              <Text style={styles.statValue}>{usd(protocol?.tvlUsd ?? 0)}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>24h DEX volume</Text>
              <Text style={styles.statValue}>{usd(protocol?.dexVolume24hUsd ?? 0)}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>30d revenue</Text>
              <Text style={styles.statValue}>{usd(protocol?.revenue30dUsd ?? 0)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider}>
          <Text style={styles.label}>Sources</Text>
          {uniqueSources.map((s) => (
            <Text key={s} style={styles.sourceItem}>
              {s}
            </Text>
          ))}
          <Text style={styles.sourceItem}>Dune API + direct RPC</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            Holder, whale, and protocol figures are pulled directly from on-chain data;
            narrative sections only interpret those figures, never invent them. This
            document is hashed at delivery and the record is checkable independently of
            this file.
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
