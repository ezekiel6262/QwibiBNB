import { rwaMock } from "./mock";
import type { RwaAdapter, RwaAssetClass } from "./types";

const DEFILLAMA_PROTOCOLS = "https://api.llama.fi/protocols";
const DEFILLAMA_YIELDS = "https://yields.llama.fi/pools";

type DefiLlamaProtocol = {
  name: string;
  slug: string;
  category: string;
  address?: string | null;
  tvl: number;
  tags?: string[];
};

const MORALIS_CHAIN_BY_PREFIX: Record<string, string> = {
  ethereum: "eth",
  polygon: "polygon",
  bsc: "bsc",
  arbitrum: "arbitrum",
  optimism: "optimism",
  avalanche: "avalanche",
  avax: "avalanche",
  base: "base",
};

function splitChainAndAddress(raw: string): { chain: string; address: string } {
  const idx = raw.indexOf(":");
  if (idx === -1) return { chain: "ethereum", address: raw };
  return { chain: raw.slice(0, idx), address: raw.slice(idx + 1) };
}

function findRwaProtocolByAddress(
  protocols: DefiLlamaProtocol[],
  inputAddress: string
): (DefiLlamaProtocol & { chain: string; bareAddress: string }) | null {
  const target = inputAddress.toLowerCase();
  const matches = protocols
    .filter((p) => p.category === "RWA" && p.address)
    .map((p) => {
      const { chain, address } = splitChainAndAddress(p.address!);
      return { ...p, chain, bareAddress: address.toLowerCase() };
    })
    .filter((p) => p.bareAddress === target);

  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.tvl - a.tvl)[0];
}

function deriveAssetClass(tags: string[] | undefined, fallback: RwaAssetClass): RwaAssetClass {
  const set = new Set(tags ?? []);
  if (set.has("Treasury Bills") || set.has("Money Market Funds") || set.has("Other Fixed Income")) {
    return "treasury";
  }
  if (set.has("Commodities")) return "commodity";
  if (set.has("Real Estate")) return "real_estate";
  return fallback;
}

async function fetchApy(slug: string): Promise<number> {
  const res = await fetch(DEFILLAMA_YIELDS);
  if (!res.ok) return 0;
  const { data } = (await res.json()) as { data?: { project: string; apy?: number; tvlUsd?: number }[] };
  const pools = (data ?? []).filter((p) => p.project === slug);
  if (pools.length === 0) return 0;
  const best = pools.sort((a, b) => (b.tvlUsd ?? 0) - (a.tvlUsd ?? 0))[0];
  return Math.round((best.apy ?? 0) * 100) / 100;
}

async function fetchHolderCount(chain: string, address: string): Promise<number> {
  const moralisChain = MORALIS_CHAIN_BY_PREFIX[chain];
  if (!moralisChain) return 0;
  try {
    const res = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${address}/holders?chain=${moralisChain}`,
      { headers: { "X-API-Key": process.env.MORALIS_API_KEY! } }
    );
    if (!res.ok) return 0;
    const data = (await res.json()) as { totalHolders?: number };
    return data.totalHolders ?? 0;
  } catch {
    return 0;
  }
}

export const rwaReal: RwaAdapter = {
  async getRwaMetrics(protocolAddress, assetClass) {
    const res = await fetch(DEFILLAMA_PROTOCOLS);
    if (!res.ok) throw new Error(`rwa: failed to fetch DefiLlama protocol list (${res.status})`);
    const protocols = (await res.json()) as DefiLlamaProtocol[];

    const match = findRwaProtocolByAddress(protocols, protocolAddress);
    if (!match) {
      const fallback = await rwaMock.getRwaMetrics(protocolAddress, assetClass);
      return { ...fallback, dataSource: "mock" };
    }

    const [yieldApyPct, holderCount] = await Promise.all([
      fetchApy(match.slug),
      fetchHolderCount(match.chain, match.bareAddress),
    ]);

    return {
      protocolName: match.name,
      assetClass: deriveAssetClass(match.tags, assetClass),
      totalValueLockedUsd: Math.round(match.tvl),
      yieldApyPct,
      backingRatioPct: 0,
      holderCount,
      redemptions: [],
      dataSource: "live",
    };
  },
};
