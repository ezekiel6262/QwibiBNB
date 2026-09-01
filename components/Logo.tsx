/**
 * Grid Q - square counterform on the Swiss grid, blue tail breaks the frame. Keep this in
 * sync with lib/branding/logo.ts (same mark, exported as a raw SVG string for the HTML
 * deliverable templates, which can't import React components).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden="true">
      <rect x="2" y="2" width="13" height="13" fill="#0d1117" />
      <rect x="5" y="5" width="5" height="5" fill="#ffffff" />
      <rect x="11" y="11" width="6" height="6" fill="#1d4ed8" />
    </svg>
  );
}
