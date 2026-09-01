/**
 * Small labeled-address table standing in for what a real integration would get from a
 * provider's address-labeling data (Moralis/Arkham-style tags). The compute stage's
 * classifier looks addresses up here; the Moralis mock adapter draws from the same table
 * so mock fixtures exercise every classification branch. Addresses outside this table
 * fall through to the default p2p_transfer/spending rule in lib/pipeline/stages/compute.ts.
 */
export type CounterpartyKind = "cex" | "bridge" | "defi" | "nft";

export const KNOWN_COUNTERPARTIES: Record<string, CounterpartyKind> = {
  "0xcex1a2b3c4d5e6f7089a1b2c3d4e5f60718293a4": "cex",
  "0xcex29f8e7d6c5b4a3928374651029384756abcd": "cex",
  "0xbridge1029384756abcdef0123456789abcdef01": "bridge",
  "0xdefi9988776655443322110099887766554433aa": "defi",
  "0xnftmarket1234567890abcdef1234567890abcd": "nft",
};

export const KNOWN_COUNTERPARTY_LIST = Object.keys(KNOWN_COUNTERPARTIES);
