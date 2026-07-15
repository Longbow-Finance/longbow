/**
 * Longbow keeper bot.
 *
 * Two jobs, run on a fixed interval:
 *   1. Keep the TWAP fresh by calling `oracle.update()` (skipped automatically
 *      when the averaging period has not yet elapsed).
 *   2. Scan every open position and `liquidate()` any that are below their
 *      liquidation price, earning the keeper bounty.
 *
 * Configure via a `.env` file (see `.env.example`). Run with `npm start`.
 */
import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

// --- Config -----------------------------------------------------------------

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const RPC_URL = process.env.RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 4663);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS ?? 60_000);

const account = privateKeyToAccount(required("PRIVATE_KEY") as Hex);
const POSITION_MANAGER = required("POSITION_MANAGER") as Address;
const ORACLE = required("ORACLE") as Address;

const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = createPublicClient({ chain: robinhoodChain, transport: http() });
const walletClient = createWalletClient({ chain: robinhoodChain, transport: http(), account });

// --- ABIs (only what the keeper calls) --------------------------------------

const positionManagerAbi = [
  { type: "function", name: "nextPositionId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "isLiquidatable",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "liquidate",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
] as const;

const oracleAbi = [
  { type: "function", name: "update", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

// --- Jobs -------------------------------------------------------------------

async function updateOracle(): Promise<void> {
  try {
    const { request } = await publicClient.simulateContract({
      address: ORACLE,
      abi: oracleAbi,
      functionName: "update",
      account,
    });
    const hash = await walletClient.writeContract(request);
    console.log(`[oracle] update sent: ${hash}`);
  } catch (err) {
    // Most commonly PeriodNotElapsed() — nothing to do this tick.
    const msg = (err as { shortMessage?: string }).shortMessage ?? String(err);
    if (!/PeriodNotElapsed/.test(msg)) console.warn(`[oracle] update skipped: ${msg}`);
  }
}

async function scanAndLiquidate(): Promise<void> {
  const next = (await publicClient.readContract({
    address: POSITION_MANAGER,
    abi: positionManagerAbi,
    functionName: "nextPositionId",
  })) as bigint;

  if (next === 0n) return;

  // `isLiquidatable` returns false for closed positions, so a single pass over
  // all ids is sufficient. For large id ranges, batch these into a multicall.
  const ids = Array.from({ length: Number(next) }, (_, i) => BigInt(i));
  const flags = await Promise.all(
    ids.map((id) =>
      publicClient
        .readContract({ address: POSITION_MANAGER, abi: positionManagerAbi, functionName: "isLiquidatable", args: [id] })
        .catch(() => false),
    ),
  );

  for (let i = 0; i < ids.length; i++) {
    if (!flags[i]) continue;
    const id = ids[i];
    try {
      const { request } = await publicClient.simulateContract({
        address: POSITION_MANAGER,
        abi: positionManagerAbi,
        functionName: "liquidate",
        args: [id],
        account,
      });
      const hash = await walletClient.writeContract(request);
      console.log(`[liquidate] position #${id} -> ${hash}`);
    } catch (err) {
      const msg = (err as { shortMessage?: string }).shortMessage ?? String(err);
      console.warn(`[liquidate] position #${id} failed: ${msg}`);
    }
  }
}

async function tick(): Promise<void> {
  await updateOracle();
  await scanAndLiquidate();
}

async function main(): Promise<void> {
  console.log(
    `Longbow keeper started (chain ${CHAIN_ID}, keeper ${account.address}), polling every ${POLL_INTERVAL_MS}ms`,
  );
  await tick();
  setInterval(() => {
    tick().catch((e) => console.error("[tick] error:", e));
  }, POLL_INTERVAL_MS);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
