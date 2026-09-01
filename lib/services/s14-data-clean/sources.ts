import Papa from "papaparse";
import { moralis } from "@/lib/adapters/moralis";
import { coingecko } from "@/lib/adapters/coingecko";
import { normalizeHeader, dedupeHeaders } from "./normalize";

export type SourceFlag = { rowIndex: number; reason: string };
export type SourceTable = {
  columns: string[];
  rows: Record<string, unknown>[];
  sourceFlags?: SourceFlag[];
};

export function parseCsvSource(raw: string): SourceTable {
  const parsed = Papa.parse<string[]>(raw.trim(), { skipEmptyLines: true });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error(`could not parse CSV - ${parsed.errors[0].message}`);
  }
  const [headerRow, ...dataRows] = parsed.data;
  if (!headerRow || dataRows.length === 0) {
    throw new Error("need a header row and at least one data row");
  }

  const columns = dedupeHeaders(headerRow.map((h, i) => normalizeHeader(h, i)));
  const filteredRows = dataRows.filter((r) => r.some((cell) => cell.trim() !== ""));
  const sourceFlags: SourceFlag[] = [];

  const rows = filteredRows.map((r, i) => {
    if (r.length !== columns.length) {
      sourceFlags.push({
        rowIndex: i,
        reason: `row has ${r.length} fields but the header has ${columns.length} - values ` +
          `may be misaligned (often an unquoted comma inside a field)`,
      });
    }
    const row: Record<string, unknown> = {};
    columns.forEach((c, i2) => {
      row[c] = r[i2] ?? "";
    });
    return row;
  });

  return { columns, rows, sourceFlags };
}

function flattenObject(obj: unknown, prefix = "", result: Record<string, unknown> = {}): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    if (prefix) result[prefix] = obj;
    return result;
  }
  if (Array.isArray(obj)) {
    result[prefix || "value"] = JSON.stringify(obj);
    return result;
  }
  if (typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const nextPrefix = prefix ? `${prefix}_${key}` : key;
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        flattenObject(value, nextPrefix, result);
      } else if (Array.isArray(value)) {
        result[nextPrefix] = JSON.stringify(value);
      } else {
        result[nextPrefix] = value;
      }
    }
    return result;
  }
  result[prefix || "value"] = obj;
  return result;
}

function findArrayOfObjects(value: unknown, depth = 0): Record<string, unknown>[] | null {
  if (depth > 5) return null;
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "object" && v !== null && !Array.isArray(v))) {
    return value as Record<string, unknown>[];
  }
  if (value !== null && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      const found = findArrayOfObjects(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function parseJsonSource(raw: string): SourceTable {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`could not parse JSON - ${err instanceof Error ? err.message : "invalid syntax"}`);
  }

  const records = findArrayOfObjects(parsed);
  if (!records) {
    throw new Error("could not find an array of objects in this JSON - paste a JSON array, or a dump containing one");
  }

  const flattened = records.map((r) => flattenObject(r));
  const columnSet = new Set<string>();
  flattened.forEach((r) => Object.keys(r).forEach((k) => columnSet.add(k)));
  const columns = dedupeHeaders(Array.from(columnSet).map((h, i) => normalizeHeader(h, i)));
  const columnMap = Array.from(columnSet).map((original, i) => [original, columns[i]] as const);

  const rows = flattened.map((r) => {
    const row: Record<string, unknown> = {};
    for (const [original, normalized] of columnMap) {
      row[normalized] = r[original] ?? "";
    }
    return row;
  });

  return { columns, rows };
}

export async function fetchOnchainSource(address: string): Promise<SourceTable> {
  const transactions = await moralis.getTransactions(address, []);
  const columns = ["tx_hash", "chain", "direction", "counterparty", "asset", "amount", "usd_value", "timestamp"];

  const rows = await Promise.all(
    transactions.map(async (tx) => {
      const priceUsd = await coingecko.getHistoricalPriceUsd(tx.asset, tx.timestamp);
      return {
        tx_hash: tx.txHash,
        chain: tx.chain,
        direction: tx.direction,
        counterparty: tx.counterparty,
        asset: tx.asset,
        amount: tx.amount,
        usd_value: Math.round(tx.amount * priceUsd * 100) / 100,
        timestamp: tx.timestamp,
      };
    })
  );

  return { columns, rows };
}
