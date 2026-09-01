import { pdf, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";

/**
 * Renders a react-pdf <Document> element to a PDF buffer. Pure JS, no headless browser, no
 * native binary - this replaced an earlier Puppeteer + @sparticuz/chromium approach that
 * worked locally but repeatedly failed on Vercel ("libnss3.so: cannot open shared object
 * file"), a known friction point between that package and Vercel's function bundle size
 * limits. react-pdf has no such dependency and behaves identically in dev and on Vercel.
 */
export async function renderPdfDocument(document: ReactElement<DocumentProps>): Promise<Buffer> {
  const stream = await pdf(document).toBuffer();
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}
