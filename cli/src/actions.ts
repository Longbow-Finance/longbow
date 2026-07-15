import { parseEther, formatEther, type Address } from "viem";
import { publicClient, getWallet, getAccount } from "./client.js";
import { addresses, contractsReady, EXPLORER, robinhoodChain } from "./config.js";
import { positionManagerAbi, oracleAbi, erc20Abi, type Position } from "./abi.js";
import { fmt, fmtMultiplier, fmtPrice, pct, shortAddr } from "./format.js";
import { lime, limeBold, dim, bold, white, gray, red, yellow, green, kv, rule } from "./theme.js";

const WAD = 10n ** 18n;

function notReady(): boolean {
  if (!contractsReady) {
    console.log(
      "\n" +
        yellow("  Contracts are not configured yet.") +
        "\n" +
        gray("  Set LONGBOW_POSITION_MANAGER / LONGBOW_LONG_TOKEN / LONGBOW_ORACLE in .env once deployed.\n"),
    );
    return true;
  }
  return false;
}

async function readPM<T>(functionName: string, args: unknown[] = []): Promise<T> {
  return publicClient.readContract({
    address: addresses.positionManager,
    abi: positionManagerAbi,
    functionName: functionName as never,
    args: args as never,
  }) as Promise<T>;
}

export async function printStats(): Promise<void> {
  if (notReady()) return;
  try {
    const [price, maxMult, minCol, mmBps, bountyBps, reserve, available, earmarked, nextId] =
      await Promise.all([
        publicClient.readContract({ address: addresses.oracle, abi: oracleAbi, functionName: "priceWad" }) as Promise<bigint>,
        readPM<bigint>("maxMultiplierWad"),
        readPM<bigint>("minCollateral"),
        readPM<bigint>("maintenanceMarginBps"),
        readPM<bigint>("liquidationBountyBps"),
        readPM<bigint>("reserveBalance"),
        readPM<bigint>("availableReserve"),
        readPM<bigint>("totalEarmarked"),
        readPM<bigint>("nextPositionId"),
      ]);
    const [symbol, supply] = await Promise.all([
      publicClient.readContract({ address: addresses.long, abi: erc20Abi, functionName: "symbol" }) as Promise<string>,
      publicClient.readContract({ address: addresses.long, abi: erc20Abi, functionName: "totalSupply" }) as Promise<bigint>,
    ]);

    console.log("\n" + lime("[ TOKEN STATISTICS ]") + "\n");
    console.log(kv("Token", `${white(symbol)} ${gray("(Longbow)")}`));
    console.log(kv("Price", `${limeBold(fmtPrice(price))} ${gray("ETH / " + symbol)}`));
    console.log(kv("Total supply", `${fmt(supply, 0)} ${gray(symbol)}`));
    console.log(rule(56));
    console.log(kv("Reward reserve", `${white(fmt(reserve, 0))} ${gray(symbol)}`));
    console.log(kv("Available capacity", `${white(fmt(available, 0))} ${gray(symbol)}`));
    console.log(kv("Earmarked", `${white(fmt(earmarked, 0))} ${gray(symbol)}`));
    console.log(rule(56));
    console.log(kv("Max multiplier", limeBold(fmtMultiplier(maxMult))));
    console.log(kv("Min collateral", `${fmt(minCol, 4)} ${gray("ETH")}`));
    console.log(kv("Maintenance margin", `${Number(mmBps) / 100}%`));
    console.log(kv("Liquidation bounty", `${Number(bountyBps) / 100}%`));
    console.log(kv("Positions opened", String(nextId)));
    console.log("");
  } catch (e) {
    console.log(red("\n  Failed to read stats: ") + gray(errMsg(e)) + "\n");
  }
}

export async function printPositions(address: Address): Promise<void> {
  if (notReady()) return;
  try {
    const price = (await publicClient.readContract({ address: addresses.oracle, abi: oracleAbi, functionName: "priceWad" })) as bigint;
    const nextId = await readPM<bigint>("nextPositionId");
    const count = Number(nextId);

    console.log("\n" + lime("[ POSITIONS ]") + gray("  owner ") + white(shortAddr(address)) + "\n");
    if (count === 0) {
      console.log(gray("  No positions have ever been opened.\n"));
      return;
    }

    const lower = address.toLowerCase();
    let found = 0;
    for (let i = 0; i < count; i++) {
      const p = (await readPM<Position>("getPosition", [BigInt(i)])) as Position;
      if (!p.open || p.owner.toLowerCase() !== lower) continue;
      found++;
      const [equity, reward, liq, liquidatable] = await Promise.all([
        readPM<bigint>("positionEquity", [BigInt(i)]),
        readPM<bigint>("pendingReward", [BigInt(i)]),
        readPM<bigint>("liquidationPrice", [BigInt(i)]),
        readPM<boolean>("isLiquidatable", [BigInt(i)]),
      ]);
      printPositionCard(i, p, price, equity, reward, liq, liquidatable);
    }
    if (found === 0) console.log(gray("  No open positions for this address.\n"));
  } catch (e) {
    console.log(red("\n  Failed to read positions: ") + gray(errMsg(e)) + "\n");
  }
}

function printPositionCard(
  id: number,
  p: Position,
  price: bigint,
  equity: bigint,
  reward: bigint,
  liq: bigint,
  liquidatable: boolean,
): void {
  const pnl = equity - p.collateral;
  const inProfit = pnl >= 0n;
  const pnlPct = p.collateral > 0n ? (Number(pnl) / Number(p.collateral)) * 100 : 0;
  const move = pct(p.entryPriceWad, price);
  const distToLiq = price > 0n && liq > 0n ? (Number(price - liq) / Number(price)) * 100 : 0;
  const pnlStr = `${inProfit ? "+" : "-"}${fmt(pnl < 0n ? -pnl : pnl, 4)} ETH`;

  const tag = liquidatable ? red("  AT RISK") : "";
  console.log(
    `  ${limeBold("#" + id)}  ${lime(fmtMultiplier(p.multiplierWad))}   ` +
      `${inProfit ? green(pnlStr) : red(pnlStr)} ${gray(`(${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%)`)}${tag}`,
  );
  console.log(kv("   collateral", `${fmt(p.collateral, 4)} ${gray("ETH")}`, 22));
  console.log(kv("   equity now", `${fmt(equity, 4)} ${gray("ETH")}`, 22));
  console.log(kv("   reward", `${lime(fmt(reward, 2))} ${gray("LONG")}`, 22));
  console.log(kv("   entry / now", `${fmtPrice(p.entryPriceWad)} ${gray("->")} ${fmtPrice(price)} ${gray(`(${move >= 0 ? "+" : ""}${move.toFixed(1)}%)`)}`, 22));
  console.log(kv("   liquidation", `${fmtPrice(liq)} ${gray("ETH")}  ${dim(`${distToLiq.toFixed(1)}% away`)}`, 22));
  console.log("");
}

export async function openPosition(amountEth: string, multiplier: number): Promise<void> {
  if (notReady()) return;
  const account = getAccount();
  const wallet = getWallet();
  if (!account || !wallet) {
    console.log(yellow("\n  Connect a wallet first (menu option: Connect wallet).\n"));
    return;
  }
  let value: bigint;
  try {
    value = parseEther(amountEth);
  } catch {
    console.log(red("\n  Invalid ETH amount.\n"));
    return;
  }
  const multiplierWad = parseEther(String(multiplier));

  try {
    console.log(gray("\n  Simulating..."));
    const { request } = await publicClient.simulateContract({
      account,
      address: addresses.positionManager,
      abi: positionManagerAbi,
      functionName: "openPosition",
      args: [multiplierWad],
      value,
    });
    console.log(gray("  Signing locally & broadcasting..."));
    const hash = await wallet.writeContract(request as never);
    await confirm(hash);
  } catch (e) {
    console.log(red("\n  Open failed: ") + gray(errMsg(e)) + "\n");
  }
}

export async function closePosition(id: number): Promise<void> {
  if (notReady()) return;
  const account = getAccount();
  const wallet = getWallet();
  if (!account || !wallet) {
    console.log(yellow("\n  Connect a wallet first (menu option: Connect wallet).\n"));
    return;
  }
  try {
    console.log(gray("\n  Simulating..."));
    const { request } = await publicClient.simulateContract({
      account,
      address: addresses.positionManager,
      abi: positionManagerAbi,
      functionName: "closePosition",
      args: [BigInt(id)],
    });
    console.log(gray("  Signing locally & broadcasting..."));
    const hash = await wallet.writeContract(request as never);
    await confirm(hash);
  } catch (e) {
    console.log(red("\n  Close failed: ") + gray(errMsg(e)) + "\n");
  }
}

async function confirm(hash: `0x${string}`): Promise<void> {
  console.log(gray("  tx ") + white(hash));
  console.log(dim(`  ${EXPLORER}/tx/${hash}`));
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status === "success") {
    console.log(green("  Confirmed.") + gray(` block ${receipt.blockNumber}\n`));
  } else {
    console.log(red("  Reverted.\n"));
  }
}

function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  const match = m.match(/reverted with (?:reason|custom error)?:?\s*([^\n]+)/i);
  return (match ? match[1] : m.split("\n")[0]).slice(0, 160);
}

export { formatEther, robinhoodChain };
