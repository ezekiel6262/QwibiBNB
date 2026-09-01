import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import { PdfLogo } from "@/lib/pdf/PdfLogo";
import { PDF_COLORS } from "@/lib/pdf/theme";
import type { AssetRow } from "./market";

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
  tableHeader: {
    flexDirection: "row",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingBottom: 5,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 6,
    alignItems: "center",
  },
  colClass: { width: 55 },
  colSymbol: { width: 70, fontWeight: 700 },
  colPrice: { width: 90 },
  colChange: { width: 80 },
  colVolume: { width: 110 },
  colCap: { width: 100 },
  classTag: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted },
  up: { color: PDF_COLORS.green, fontWeight: 700 },
  down: { color: "#b91c1c", fontWeight: 700 },
  flat: { color: PDF_COLORS.muted, fontWeight: 700 },
  divider: { borderTop: `0.5px solid ${PDF_COLORS.border}`, marginTop: 16, paddingTop: 12 },
  label: {
    fontFamily: "Courier",
    fontSize: 8,
    color: PDF_COLORS.muted,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  methodology: { fontSize: 9, color: PDF_COLORS.secondary, lineHeight: 1.5 },
  disclaimer: { fontSize: 9, color: PDF_COLORS.secondary, lineHeight: 1.5, marginTop: 8 },
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
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function changeStyle(pct: number) {
  if (pct > 0.01) return styles.up;
  if (pct < -0.01) return styles.down;
  return styles.flat;
}

export function MarketBriefDocument(props: {
  rows: AssetRow[];
  summary: string;
  preparedAt: string;
  jobId: string;
  objective: string;
  unavailable?: string[];
}) {
  const { rows, summary, preparedAt, jobId, objective, unavailable = [] } = props;

  return (
    <Document title="Market intelligence brief">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <PdfLogo size={14} />
          <Text style={styles.wordmark}>QWIBI</Text>
          <Text style={styles.tag}>MARKET INTELLIGENCE - S6</Text>
        </View>

        <Text style={styles.eyebrow}>Data as of {preparedAt}</Text>
        <Text style={styles.title}>Cross-asset market brief</Text>

        <View>
          <Text style={styles.sectionHeading}>Executive summary</Text>
          <Text style={styles.sectionBody}>{summary}</Text>
          {objective ? (
            <Text style={{ fontSize: 9, color: PDF_COLORS.muted, marginTop: -12, marginBottom: 18 }}>
              Reader focus: {objective}
            </Text>
          ) : null}
          {unavailable.length > 0 ? (
            <Text style={{ fontSize: 9, color: PDF_COLORS.muted, marginTop: -12, marginBottom: 18 }}>
              No market data available for: {unavailable.join(", ")}. This brief covers the
              remaining assets only.
            </Text>
          ) : null}
        </View>

        <View>
          <Text style={styles.sectionHeading}>Asset snapshot</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colClass]}>Class</Text>
            <Text style={[styles.tableHeaderCell, styles.colSymbol]}>Symbol</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Price (USD)</Text>
            <Text style={[styles.tableHeaderCell, styles.colChange]}>24h change</Text>
            <Text style={[styles.tableHeaderCell, styles.colVolume]}>24h volume</Text>
            <Text style={[styles.tableHeaderCell, styles.colCap]}>Market cap</Text>
          </View>
          {rows.map((r) => (
            <View key={`${r.assetClass}-${r.symbol}`} style={styles.row}>
              <Text style={[styles.classTag, styles.colClass]}>
                {r.assetClass === "crypto" ? "CRYPTO" : "EQUITY"}
              </Text>
              <Text style={styles.colSymbol}>{r.symbol}</Text>
              <Text style={styles.colPrice}>{usd(r.priceUsd)}</Text>
              <Text style={[changeStyle(r.change24hPct), styles.colChange]}>
                {r.change24hPct > 0 ? "+" : ""}
                {r.change24hPct.toFixed(2)}%
              </Text>
              <Text style={styles.colVolume}>{usd(r.volumeUsd)}</Text>
              <Text style={styles.colCap}>{r.marketCapUsd ? usd(r.marketCapUsd) : "-"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider}>
          <Text style={styles.label}>Not investment advice</Text>
          <Text style={styles.disclaimer}>
            This brief presents data as observed and interprets it for framing only. It is not
            personalized investment advice and does not recommend buying, selling, or holding
            any asset. Prices, volumes, and market caps are point-in-time snapshots as of the
            timestamp above and will have moved since.
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            Crypto figures are pulled from CoinGecko market data; equity figures from Alpha
            Vantage global quotes. Narrative sections only interpret the figures shown, never
            invent them. This document is hashed at delivery and the record is checkable
            independently of this file.
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
