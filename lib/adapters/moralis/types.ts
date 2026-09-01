import type { RawTransaction } from "@/lib/pipeline/types";

export type MoralisAdapter = {
  /**
   * siblingAddresses are the other addresses in the same statement request - the mock
   * adapter uses them to occasionally simulate a self-transfer between the user's own
   * wallets, which the compute stage is expected to detect and exclude from income.
   */
  getTransactions(address: string, siblingAddresses: string[]): Promise<RawTransaction[]>;
};
