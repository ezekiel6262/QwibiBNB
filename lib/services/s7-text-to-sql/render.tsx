import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
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
  title: { fontSize: 16, fontWeight: 700, marginBottom: 20 },
  sectionHeading: { fontSize: 13, fontWeight: 700, marginBottom: 8, marginTop: 4 },
  sectionBody: { fontSize: 10.5, lineHeight: 1.6, color: PDF_COLORS.body, marginBottom: 16 },
  sqlBox: {
    backgroundColor: "#f6f8fa",
    border: `0.5px solid ${PDF_COLORS.border}`,
    padding: 10,
    marginBottom: 18,
  },
  sqlText: { fontFamily: "Courier", fontSize: 9, color: PDF_COLORS.ink, lineHeight: 1.5 },
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
    flex: 1,
  },
  row: {
    flexDirection: "row",
    borderBottom: `0.5px solid ${PDF_COLORS.border}`,
    paddingVertical: 5,
  },
  cell: { fontSize: 9.5, color: PDF_COLORS.body, flex: 1 },
  note: { fontSize: 8.5, color: PDF_COLORS.muted, marginTop: 6 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 8 },
  barLabel: { width: 90, fontSize: 8.5, color: PDF_COLORS.body },
  barTrack: { flex: 1, height: 10, backgroundColor: "#eef2ff" },
  barFill: { height: 10, backgroundColor: PDF_COLORS.accent },
  barValue: { width: 70, fontSize: 8.5, color: PDF_COLORS.ink, textAlign: "right" },
  divider: { borderTop: `0.5px solid ${PDF_COLORS.border}`, marginTop: 16, paddingTop: 12 },
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
    marginTop: 24,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.muted },
  footerLink: { fontFamily: "Courier", fontSize: 8, color: PDF_COLORS.accent },
});

function formatValue(v: unknown): string {
  if (typeof v === "number") return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v === null || v === undefined) return "-";
  return String(v);
}

export function TextToSqlDocument(props: {
  question: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  truncated: boolean;
  answer: string;
  sourceLabel: string;
  jobId: string;
}) {
  const { question, sql, columns, rows, totalRows, truncated, answer, sourceLabel, jobId } = props;
  const preparedAt = new Date().toISOString();
  const displayRows = rows.slice(0, 25);
  const isBarChart =
    columns.length === 2 && rows.every((r) => typeof r[columns[1]] === "number") && rows.length > 1;
  const maxValue = isBarChart ? Math.max(...rows.map((r) => Number(r[columns[1]]))) : 0;

  return (
    <Document title={`Text to SQL: ${question}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <PdfLogo size={14} />
          <Text style={styles.wordmark}>QWIBI</Text>
          <Text style={styles.tag}>TEXT-TO-SQL - S7</Text>
        </View>

        <Text style={styles.eyebrow}>{sourceLabel}</Text>
        <Text style={styles.title}>{question}</Text>

        <Text style={styles.sectionHeading}>Query</Text>
        <View style={styles.sqlBox}>
          <Text style={styles.sqlText}>{sql}</Text>
        </View>

        <Text style={styles.sectionHeading}>Answer</Text>
        <Text style={styles.sectionBody}>{answer}</Text>

        <Text style={styles.sectionHeading}>Results</Text>
        {isBarChart ? (
          <View style={{ marginBottom: 16 }}>
            {rows.slice(0, 12).map((r, i) => {
              const value = Number(r[columns[1]]);
              const pct = maxValue > 0 ? Math.max(2, (value / maxValue) * 100) : 0;
              return (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel}>{formatValue(r[columns[0]])}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barValue}>{formatValue(value)}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.tableHeader}>
          {columns.map((c) => (
            <Text key={c} style={styles.tableHeaderCell}>
              {c}
            </Text>
          ))}
        </View>
        {displayRows.map((r, i) => (
          <View key={i} style={styles.row}>
            {columns.map((c) => (
              <Text key={c} style={styles.cell}>
                {formatValue(r[c])}
              </Text>
            ))}
          </View>
        ))}
        {(truncated || rows.length > displayRows.length) && (
          <Text style={styles.note}>
            Showing {displayRows.length} of {totalRows} row{totalRows === 1 ? "" : "s"}
            {truncated ? " (query itself was limited)" : " (display truncated)"}.
          </Text>
        )}

        <View style={styles.divider}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            Queries run against a read-only connection: single-statement SELECT/WITH only, no
            data-modifying keywords permitted, a statement timeout, and a row limit are
            enforced before execution. The answer above only interprets the rows shown, never
            invents a figure outside them. This document is hashed at delivery and the record
            is checkable independently of this file.
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
