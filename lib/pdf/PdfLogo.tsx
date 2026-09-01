import { Svg, Rect } from "@react-pdf/renderer";

/**
 * Grid Q - square counterform on the Swiss grid, blue tail breaks the frame. Same mark as
 * components/Logo.tsx (website) and the retired lib/branding/logo.ts (old HTML deliverables),
 * redrawn with react-pdf's Svg primitives since PDF documents can't use a plain <svg> string.
 */
export function PdfLogo({ size = 16 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Rect x={2} y={2} width={13} height={13} fill="#0d1117" />
      <Rect x={5} y={5} width={5} height={5} fill="#ffffff" />
      <Rect x={11} y={11} width={6} height={6} fill="#1d4ed8" />
    </Svg>
  );
}
