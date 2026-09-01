import type { RawTransaction } from "@/lib/pipeline/types";
import { KNOWN_COUNTERPARTIES } from "@/lib/pipeline/known-counterparties";
import type { MoralisAdapter } from "./types";

const CEX_ADDRESSES = Object.keys(KNOWN_COUNTERPARTIES).filter(
  (a) => KNOWN_COUNTERPARTIES[a] === "cex"
);
const BRIDGE_ADDRESS = Object.keys(KNOWN_COUNTERPARTIES).find(
  (a) => KNOWN_COUNTERPARTIES[a] === "bridge"
)!;
const DEFI_ADDRESS = Object.keys(KNOWN_COUNTERPARTIES).find(
  (a) => KNOWN_COUNTERPARTIES[a] === "defi"
)!;
const NFT_ADDRESS = Object.keys(KNOWN_COUNTERPARTIES).find(
  (a) => KNOWN_COUNTERPARTIES[a] === "nft"
)!;
const PEER_ADDRESSES = [
  "0x88ab7766554433221100ffeeddccbbaa9988771",
  "0x3fca1029384756abcdef0123456789abcdef012",
];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

// Small deterministic hash so different demo wallets don't render byte-identical amounts.
function seedFrom(address: string): number {
  let seed = 0;
  for (let i = 0; i < address.length; i++) {
    seed = (seed * 31 + address.charCodeAt(i)) >>> 0;
  }
  return seed;
}

export const moralisMock: MoralisAdapter = {
  async getTransactions(address, siblingAddresses) {
    const short = address.replace(/^0x/i, "").slice(0, 6);
    const seed = seedFrom(address);
    const jitter = 0.7 + (seed % 60) / 100; // 0.70x - 1.29x, deterministic per address
    const scale = (n: number, decimals = 2) => Number((n * jitter).toFixed(decimals));

    const txs: RawTransaction[] = [
      {
        txHash: `0x${short}01`,
        chain: "ethereum",
        address,
        direction: "in",
        counterparty: CEX_ADDRESSES[0],
        asset: "USDC",
        amount: Math.round(scale(3200)),
        timestamp: daysAgo(58),
      },
      {
        txHash: `0x${short}02`,
        chain: "ethereum",
        address,
        direction: "out",
        counterparty: PEER_ADDRESSES[0],
        asset: "USDC",
        amount: Math.round(scale(420)),
        timestamp: daysAgo(52),
      },
      {
        txHash: `0x${short}03`,
        chain: "ethereum",
        address,
        direction: "in",
        counterparty: DEFI_ADDRESS,
        asset: "ETH",
        amount: scale(0.18, 3),
        timestamp: daysAgo(41),
      },
      {
        txHash: `0x${short}04`,
        chain: "x-layer",
        address,
        direction: "out",
        counterparty: BRIDGE_ADDRESS,
        asset: "ETH",
        amount: scale(0.5, 3),
        timestamp: daysAgo(33),
      },
      {
        txHash: `0x${short}05`,
        chain: "ethereum",
        address,
        direction: "in",
        counterparty: NFT_ADDRESS,
        asset: "ETH",
        amount: scale(1.2, 3),
        timestamp: daysAgo(24),
      },
      {
        txHash: `0x${short}06`,
        chain: "ethereum",
        address,
        direction: "in",
        counterparty: CEX_ADDRESSES[1],
        asset: "USDC",
        amount: Math.round(scale(3450)),
        timestamp: daysAgo(20),
      },
      {
        txHash: `0x${short}07`,
        chain: "ethereum",
        address,
        direction: "out",
        counterparty: PEER_ADDRESSES[1],
        asset: "WBTC",
        amount: scale(0.02, 4),
        timestamp: daysAgo(9),
      },
      {
        txHash: `0x${short}08`,
        chain: "ethereum",
        address,
        direction: "in",
        counterparty: CEX_ADDRESSES[0],
        asset: "USDC",
        amount: Math.round(scale(3100)),
        timestamp: daysAgo(3),
      },
    ];

    if (siblingAddresses.length > 0) {
      txs.push({
        txHash: `0x${short}09`,
        chain: "ethereum",
        address,
        direction: "out",
        counterparty: siblingAddresses[0],
        asset: "ETH",
        amount: scale(0.75, 3),
        timestamp: daysAgo(15),
      });
    }

    return txs;
  },
};
