import { formatUnits } from "viem";

const WAD = 10n ** 18n;

/** Format a wei/WAD bigint to a fixed number of decimals with thin separators. */
export function fmt(value: bigint | undefined, decimals = 4, unitDecimals = 18): string {
  if (value === undefined) return "–";
  const asNum = Number(formatUnits(value, unitDecimals));
  if (!Number.isFinite(asNum)) return "–";
  return asNum.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** WAD multiplier (1e18 == 1x) to a "2.5x" style string. */
export function fmtMultiplier(multiplierWad: bigint | undefined): string {
  if (multiplierWad === undefined) return "–";
  const x = Number(formatUnits(multiplierWad, 18));
  return `${x.toLocaleString("en-US", { maximumFractionDigits: 2 })}x`;
}

/** ETH-per-LONG price (WAD) to a compact string. */
export function fmtPrice(priceWad: bigint | undefined): string {
  if (priceWad === undefined || priceWad === 0n) return "–";
  const p = Number(formatUnits(priceWad, 18));
  const decimals = p < 0.01 ? 8 : p < 1 ? 6 : 4;
  return p.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

/** Signed percentage between two WAD prices, e.g. entry vs current. */
export function pctChange(from: bigint, to: bigint): number {
  if (from === 0n) return 0;
  return (Number(to - from) / Number(from)) * 100;
}

export function shortAddress(addr?: string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export { WAD };
