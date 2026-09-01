export type AdapterMode = "mock" | "real";

export function resolveMode(requiredEnvVars: string[]): AdapterMode {
  if (process.env.MOCK_MODE === "true") return "mock";
  const hasAllKeys = requiredEnvVars.every((name) => !!process.env[name]);
  return hasAllKeys ? "real" : "mock";
}
