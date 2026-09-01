export type OutputFormat = "project_report" | "technical_article" | "proposal" | "case_study";
export type WriteupMode = "do_assignment" | "writeup_existing";

export type OutlineSection = { id: string; heading: string };

const OUTLINES: Record<OutputFormat, OutlineSection[]> = {
  project_report: [
    { id: "abstract", heading: "Abstract" },
    { id: "introduction", heading: "Introduction" },
    { id: "data_description", heading: "Data description" },
    { id: "methodology", heading: "Methodology" },
    { id: "results", heading: "Results" },
    { id: "discussion", heading: "Discussion" },
    { id: "limitations", heading: "Limitations" },
    { id: "conclusion", heading: "Conclusion" },
  ],
  technical_article: [
    { id: "hook", heading: "Hook" },
    { id: "method_walkthrough", heading: "Plain-English method walkthrough" },
    { id: "results", heading: "Results" },
    { id: "lessons_learned", heading: "Lessons learned" },
    { id: "whats_next", heading: "What is next" },
  ],
  proposal: [
    { id: "background", heading: "Background" },
    { id: "problem_statement", heading: "Problem statement" },
    { id: "proposed_methodology", heading: "Proposed methodology" },
    { id: "timeline", heading: "Timeline" },
    { id: "deliverables", heading: "Deliverables" },
    { id: "budget_and_resources", heading: "Budget and resources" },
  ],
  case_study: [
    { id: "context", heading: "Context" },
    { id: "challenge", heading: "Challenge" },
    { id: "solution", heading: "Solution" },
    { id: "measurable_results", heading: "Measurable results" },
  ],
};

export function getOutline(format: OutputFormat): OutlineSection[] {
  return OUTLINES[format];
}

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  project_report: "Project report",
  technical_article: "Technical article",
  proposal: "Proposal",
  case_study: "Case study",
};
