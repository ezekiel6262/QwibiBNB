const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const env = {
  ...readEnv(path.join(ROOT, ".env")),
  ...readEnv(path.join(ROOT, ".env.local")),
  ...process.env,
};

const ALGOD = {
  mainnet: env.ALGOD_MAINNET_URL || "https://mainnet-api.algonode.cloud",
  testnet: env.ALGOD_TESTNET_URL || "https://testnet-api.algonode.cloud",
};

const USDC_ASA = {
  mainnet: "31566704",
  testnet: "10458941",
};

const ADDRESS_RE = /^[A-Z2-7]{58}$/;

async function main() {
  const network = (env.X402_ALGORAND_NETWORK || "testnet").toLowerCase();
  const address = env.AVM_ADDRESS;
  const facilitatorUrl = env.FACILITATOR_URL || "https://facilitator.goplausible.xyz";

  console.log("Qwibi x402 readiness");
  console.log(`network: ${network}`);
  console.log(`facilitator: ${facilitatorUrl}`);
  console.log(`AVM_ADDRESS: ${address || "(missing)"}`);

  if (!["mainnet", "testnet"].includes(network)) {
    throw new Error("X402_ALGORAND_NETWORK must be mainnet or testnet.");
  }

  if (!address || !ADDRESS_RE.test(address)) {
    throw new Error("AVM_ADDRESS must be a 58-character Algorand address.");
  }

  const account = await fetchAccount(network, address);
  const assetId = USDC_ASA[network];
  const optedIn = (account.assets || []).some((asset) => String(asset["asset-id"]) === assetId);
  const algoBalance = Number(account.amount || 0) / 1_000_000;

  console.log(`ALGO balance: ${algoBalance}`);
  console.log(`USDC ASA ${assetId} opt-in: ${optedIn ? "yes" : "no"}`);

  if (!optedIn) {
    throw new Error(`Address is not opted into USDC ASA ${assetId}. Opt in before receiving x402 USDC.`);
  }

  if (algoBalance < 0.2) {
    console.warn("warn: ALGO balance is low; keep enough ALGO for minimum balance and fees.");
  }

  console.log("ready: x402 payTo address can receive Algorand USDC.");
}

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      })
  );
}

async function fetchAccount(network, address) {
  const url = `${ALGOD[network].replace(/\/$/, "")}/v2/accounts/${address}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Could not read Algorand account from ${url}: ${response.status} ${body.slice(0, 160)}`
    );
  }
  return response.json();
}

main().catch((error) => {
  console.error(`not ready: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
