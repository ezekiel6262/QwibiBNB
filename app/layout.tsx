import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://qwibi.xyz"),
  title: "Qwibi - Verified analyst work paid with x402 on Algorand",
  description:
    "Qwibi is a pay-per-request AI analyst desk for agentic finance. Agents pay with x402 on Algorand for wallet statements, market briefs, forecasts, models, dashboards, and attestation verification.",
  openGraph: {
    title: "Qwibi",
    description:
      "Verified analyst work, paid one request at a time with x402 on Algorand.",
    url: "https://qwibi.xyz",
    siteName: "Qwibi",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Qwibi",
    description:
      "Verified analyst work, paid one request at a time with x402 on Algorand.",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
