import type { RawTransaction } from "@/lib/pipeline/types";
import type { MoralisAdapter } from "./types";

const MORALIS_API = "https://deep-index.moralis.io/api/v2.2";

type MoralisTransfer = {
  from_address?: string;
  to_address?: string;
  value_formatted?: string;
  token_symbol?: string;
};

type MoralisHistoryEntry = {
  hash: string;
  block_timestamp: string;
  erc20_transfers?: MoralisTransfer[];
  native_transfers?: MoralisTransfer[];
};

function toRawTransactions(
  entry: MoralisHistoryEntry,
  address: string,
  chain: string,
  transfers: MoralisTransfer[] | undefined,
  asset: (t: MoralisTransfer) => string
): RawTransaction[] {
  return (transfers ?? []).map((t) => {
    const direction = t.to_address?.toLowerCase() === address.toLowerCase() ? "in" : "out";
    return {
      txHash: entry.hash,
      chain,
      address,
      direction,
      counterparty: (direction === "in" ? t.from_address : t.to_address) ?? "unknown",
      asset: asset(t),
      amount: Number(t.value_formatted ?? 0),
      timestamp: entry.block_timestamp,
    };
  });
}

export const moralisReal: MoralisAdapter = {
  async getTransactions(address): Promise<RawTransaction[]> {
    const res = await fetch(
      `${MORALIS_API}/wallets/${address}/history?chain=eth&order=DESC&limit=50`,
      { headers: { "X-API-Key": process.env.MORALIS_API_KEY! } }
    );
    if (!res.ok) {
      throw new Error(`moralis: failed to fetch history for ${address} (${res.status})`);
    }
    const data = (await res.json()) as { result?: MoralisHistoryEntry[] };

    return (data.result ?? []).flatMap((entry) => [
      ...toRawTransactions(entry, address, "ethereum", entry.erc20_transfers, (t) => t.token_symbol ?? "UNKNOWN"),
      ...toRawTransactions(entry, address, "ethereum", entry.native_transfers, () => "ETH"),
    ]);
  },
};
