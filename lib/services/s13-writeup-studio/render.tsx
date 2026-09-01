import { Document, Page, View, Text, StyleSheet, Link } from "@react-pdf/renderer";
import type { ResearchSnippet } from "@/lib/pipeline/types";
import { PdfLogo } from "@/lib/pdf/PdfLogo";
import { PDF_COLORS } from "@/lib/pdf/theme";
import type { OutputFormat, WriteupMode } from "./outlines";

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
  title: { fontSize: 20, fontWeight: 700, marginBottom: 24, lineHeight: 1.2 },
  sectionHeading: { fontSize: 13, fontWeight: 700, marginBottom: 6 },
  sectionBody: { fontSize: 10.5, lineHeight: 1.6, color: PDF_COLORS.body, marginBottom: 18 },
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

const MODE_LABELS: Record<WriteupMode, string> = {
  do_assignment: "Mode A - do the assignment",
  writeup_existing: "Mode B - write up existing work",
};

const FORMAT_TAGS: Record<OutputFormat, string> = {
  project_report: "PROJECT REPORT",
  technical_article: "TECHNICAL ARTICLE",
  proposal: "PROPOSAL",
  case_study: "CASE STUDY",
};

export function WriteupDocument(props: {
  title: string;
  mode: WriteupMode;
  outputFormat: OutputFormat;
  audience: string;
  sections: { heading: string; body: string }[];
  sources: ResearchSnippet[];
  hasAppendix: boolean;
  jobId: string;
}) {
  const { title, mode, outputFormat, audience, sections, sources, hasAppendix, jobId } = props;
  const uniqueSources = Array.from(new Set(sources.map((s) => s.source)));
  const preparedAt = new Date().toISOString();

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <PdfLogo size={14} />
          <Text style={styles.wordmark}>QWIBI</Text>
          <Text style={styles.tag}>{FORMAT_TAGS[outputFormat]} - S13</Text>
        </View>

        <Text style={styles.eyebrow}>
          {MODE_LABELS[mode]} - prepared for {audience}
        </Text>
        <Text style={styles.title}>{title}</Text>

        {sections.map((s) => (
          <View key={s.heading}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        {uniqueSources.length > 0 && (
          <View style={styles.divider}>
            <Text style={styles.label}>Sources</Text>
            {uniqueSources.map((s) => (
              <Text key={s} style={styles.sourceItem}>
                {s}
              </Text>
            ))}
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <Text style={styles.label}>Methodology</Text>
          <Text style={styles.methodology}>
            {mode === "do_assignment"
              ? "Every figure in this writeup traces to a real computation over the data " +
                "provided, never a fabricated number."
              : "This writeup documents only what was described in the materials provided - " +
                "it never invents results, metrics, or outcomes that were not stated there."}
            {hasAppendix
              ? " A supporting analysis appendix (stats and, if requested, a forecast) is " +
                "bundled alongside this PDF in the delivered zip."
              : ""}{" "}
            This document is hashed at delivery and the record is checkable independently of
            this file.
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
