import "dotenv/config";
import { defineChain, type Address } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

function envAddress(v: string | undefined): Address {
  if (v && /^0x[0-9a-fA-F]{40}$/.test(v)) return v as Address;
  return ZERO;
}

export const RPC_URL =
  process.env.LONGBOW_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";

export const addresses = {
  positionManager: envAddress(process.env.LONGBOW_POSITION_MANAGER),
  long: envAddress(process.env.LONGBOW_LONG_TOKEN),
  oracle: envAddress(process.env.LONGBOW_ORACLE),
} as const;

export function isConfigured(a: Address): boolean {
  return a !== ZERO;
}

export const contractsReady =
  isConfigured(addresses.positionManager) &&
  isConfigured(addresses.long) &&
  isConfigured(addresses.oracle);

/** Robinhood Chain — Arbitrum Orbit L2, ETH gas, chain id 4663. */
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
});

export const EXPLORER = "https://robinhoodchain.blockscout.com";
