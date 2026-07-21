import type { Address } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Robinhood Chain mainnet (4663) — env vars override when set. */
const MAINNET = {
  positionManager: "0x326B88686F1c3d875e8aCC5A841658561c6baA65",
  long: "0x3F29C51aAE41De14e062A8aA129cB928d277d58e",
  oracle: "0x95022e077CF330231C559AdbB0c9a2d5DC11283d",
  lpLocker: "0x4324f63BdecC6ad795D6a30f9c6bA9Ff49575a16",
} as const;

function envAddress(value: string | undefined, fallback: Address): Address {
  if (value && /^0x[0-9a-fA-F]{40}$/.test(value)) return value as Address;
  return fallback;
}

export const addresses = {
  positionManager: envAddress(
    process.env.NEXT_PUBLIC_POSITION_MANAGER,
    MAINNET.positionManager,
  ),
  long: envAddress(process.env.NEXT_PUBLIC_LONG_TOKEN, MAINNET.long),
  oracle: envAddress(process.env.NEXT_PUBLIC_ORACLE, MAINNET.oracle),
  lpLocker: envAddress(process.env.NEXT_PUBLIC_LP_LOCKER, MAINNET.lpLocker),
} as const;

export function isConfigured(addr: Address): boolean {
  return addr !== ZERO;
}

/** The PositionManager ABI — only the pieces the dashboard touches. */
export const positionManagerAbi = [
  {
    type: "function",
    name: "openPosition",
    stateMutability: "payable",
    inputs: [{ name: "multiplierWad", type: "uint256" }],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "closePosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "liquidate",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getPosition",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "multiplierWad", type: "uint96" },
          { name: "collateral", type: "uint128" },
          { name: "earmark", type: "uint128" },
          { name: "entryPriceWad", type: "uint256" },
          { name: "open", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "positionEquity",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "liquidationPrice",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "isLiquidatable",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "nextPositionId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maxMultiplierWad",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "minCollateral",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "maintenanceMarginBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "reserveBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "availableReserve",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalEarmarked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const oracleAbi = [
  {
    type: "function",
    name: "priceWad",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Shape returned by getPosition (mirrors the Solidity struct). */
export type Position = {
  owner: Address;
  multiplierWad: bigint;
  collateral: bigint;
  earmark: bigint;
  entryPriceWad: bigint;
  open: boolean;
};
