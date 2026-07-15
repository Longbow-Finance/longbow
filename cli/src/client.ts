import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type WalletClient,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { RPC_URL, robinhoodChain } from "./config.js";

export const publicClient: PublicClient = createPublicClient({
  chain: robinhoodChain,
  transport: http(RPC_URL),
});

/**
 * Session-only wallet state. The private key is turned into an Account object
 * held ONLY in this process's memory for the duration of the session. It is
 * never written to disk, logged, or sent anywhere — viem signs locally and
 * only broadcasts the signed transaction to the public RPC.
 */
let account: Account | undefined;
let wallet: WalletClient | undefined;

export function connect(privateKey: string): Account {
  const pk = privateKey.trim();
  const normalized = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Invalid private key: expected 32 bytes of hex (64 hex chars).");
  }
  account = privateKeyToAccount(normalized);
  wallet = createWalletClient({ account, chain: robinhoodChain, transport: http(RPC_URL) });
  return account;
}

export function disconnect(): void {
  account = undefined;
  wallet = undefined;
}

export function getAccount(): Account | undefined {
  return account;
}

export function getWallet(): WalletClient | undefined {
  return wallet;
}
