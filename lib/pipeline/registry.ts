import type { ServiceModule } from "./types";
import { s1PromptToReport } from "@/lib/services/s1-prompt-to-report";
import { s2PromptToFinancialModel } from "@/lib/services/s2-prompt-to-financial-model";
import { s3DataAnalysisRun } from "@/lib/services/s3-data-analysis-run";
import { s4MlForecasts } from "@/lib/services/s4-ml-forecasts";
import { s5OnchainAnalytics } from "@/lib/services/s5-onchain-analytics";
import { s6MarketIntelligence } from "@/lib/services/s6-market-intelligence";
import { s7TextToSql } from "@/lib/services/s7-text-to-sql";
import { s8DashboardBi } from "@/lib/services/s8-dashboard-bi";
import { s9StrategyBacktester } from "@/lib/services/s9-strategy-backtester";
import { s11RwaAnalytics } from "@/lib/services/s11-rwa-analytics";
import { s12WalletStatement } from "@/lib/services/s12-wallet-statement";
import { s13WriteupStudio } from "@/lib/services/s13-writeup-studio";
import { s14DataClean } from "@/lib/services/s14-data-clean";

export const registry: Record<string, ServiceModule> = {
  [s1PromptToReport.id]: s1PromptToReport,
  [s2PromptToFinancialModel.id]: s2PromptToFinancialModel,
  [s3DataAnalysisRun.id]: s3DataAnalysisRun,
  [s4MlForecasts.id]: s4MlForecasts,
  [s5OnchainAnalytics.id]: s5OnchainAnalytics,
  [s6MarketIntelligence.id]: s6MarketIntelligence,
  [s7TextToSql.id]: s7TextToSql,
  [s8DashboardBi.id]: s8DashboardBi,
  [s9StrategyBacktester.id]: s9StrategyBacktester,
  [s11RwaAnalytics.id]: s11RwaAnalytics,
  [s12WalletStatement.id]: s12WalletStatement,
  [s13WriteupStudio.id]: s13WriteupStudio,
  [s14DataClean.id]: s14DataClean,
};

export function getService(id: string): ServiceModule {
  const service = registry[id];
  if (!service) throw new Error(`unknown service: ${id}`);
  return service;
}
