import { formatUnits } from "viem";

export function fmt(value: bigint | undefined, decimals = 4, unitDecimals = 18): string {
  if (value === undefined) return "-";
  const n = Number(formatUnits(value, unitDecimals));
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

export function fmtMultiplier(m: bigint | undefined): string {
  if (m === undefined) return "-";
  return `${Number(formatUnits(m, 18)).toLocaleString("en-US", { maximumFractionDigits: 2 })}x`;
}

export function fmtPrice(p: bigint | undefined): string {
  if (p === undefined || p === 0n) return "-";
  const n = Number(formatUnits(p, 18));
  const d = n < 0.01 ? 8 : n < 1 ? 6 : 4;
  return n.toLocaleString("en-US", { maximumFractionDigits: d });
}

export function pct(from: bigint, to: bigint): number {
  if (from === 0n) return 0;
  return (Number(to - from) / Number(from)) * 100;
}

export function shortAddr(a?: string): string {
  return a ? `${a.slice(0, 6)}\u2026${a.slice(-4)}` : "";
}
