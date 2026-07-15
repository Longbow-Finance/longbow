"use client";

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { addresses, positionManagerAbi } from "@/lib/contracts";
import type { UserPosition } from "@/hooks/usePositions";
import { fmt, fmtMultiplier, fmtPrice, pctChange } from "@/lib/format";

export function PositionCard({
  up,
  priceWad,
  onClosed,
}: {
  up: UserPosition;
  priceWad?: bigint;
  onClosed?: () => void;
}) {
  const { position: p, equity, reward, liquidationPrice, liquidatable, id } = up;

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && txHash) {
      onClosed?.();
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash]);

  const collateral = p.collateral;
  const pnl = equity !== undefined ? equity - collateral : undefined;
  const pnlPct =
    equity !== undefined && collateral > 0n
      ? (Number(equity - collateral) / Number(collateral)) * 100
      : undefined;
  const inProfit = pnl !== undefined && pnl >= 0n;

  const priceMove = priceWad !== undefined ? pctChange(p.entryPriceWad, priceWad) : undefined;

  const distToLiq =
    priceWad && liquidationPrice && priceWad > 0n
      ? (Number(priceWad - liquidationPrice) / Number(priceWad)) * 100
      : undefined;
  const health = distToLiq === undefined ? 0 : Math.max(0, Math.min(100, distToLiq));

  return (
    <div className="panel framed">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="mono border border-[var(--color-border)] px-2 py-1 text-xs font-semibold">
            #{id.toString()}
          </span>
          <span className="mono border border-[var(--color-long)] px-2 py-1 text-xs font-bold text-[var(--color-long)]">
            {fmtMultiplier(p.multiplierWad)}
          </span>
          {liquidatable && (
            <span className="mono border border-[var(--color-danger)] bg-[rgba(255,77,94,0.12)] px-2 py-1 text-xs font-bold text-[var(--color-danger)]">
              AT RISK
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${inProfit ? "text-[var(--color-long)]" : "text-[var(--color-danger)]"}`}>
            {pnl === undefined ? "–" : `${pnl >= 0n ? "+" : "-"}${fmt(pnl < 0n ? -pnl : pnl, 4)} ETH`}
          </div>
          <div className="label tracking-normal normal-case">
            {pnlPct === undefined ? "" : `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}% on collateral`}
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-2 md:grid-cols-4">
        <Field label="COLLATERAL" value={`${fmt(collateral, 4)}`} unit="ETH" border bottom />
        <Field label="EQUITY NOW" value={equity !== undefined ? `${fmt(equity, 4)}` : "–"} unit="ETH" border bottom />
        <Field label="REWARD" value={reward !== undefined ? `${fmt(reward, 2)}` : "–"} unit="LONG" accent border bottom />
        <Field
          label="ENTRY → NOW"
          value={priceMove === undefined ? fmtPrice(p.entryPriceWad) : `${priceMove >= 0 ? "+" : ""}${priceMove.toFixed(1)}%`}
          accent={priceMove !== undefined && priceMove >= 0}
          danger={priceMove !== undefined && priceMove < 0}
          bottom
        />
      </div>

      {/* Health bar */}
      <div className="px-4 py-4">
        <div className="mb-1.5 flex justify-between">
          <span className="label tracking-normal normal-case">
            Liquidation {liquidationPrice ? `@ ${fmtPrice(liquidationPrice)} ETH` : ""}
          </span>
          <span className="label tracking-normal normal-case">
            {distToLiq === undefined ? "" : `${distToLiq.toFixed(1)}% away`}
          </span>
        </div>
        <div className="h-2 w-full bg-[var(--color-border)]">
          <div
            className="h-full transition-all"
            style={{
              width: `${health}%`,
              background:
                health > 40 ? "var(--color-long)" : health > 20 ? "var(--color-warn)" : "var(--color-danger)",
            }}
          />
        </div>

        {error && <div className="mono mt-3 text-sm text-[var(--color-danger)]">{shorten(error.message)}</div>}

        <button
          onClick={() =>
            writeContract({
              address: addresses.positionManager,
              abi: positionManagerAbi,
              functionName: "closePosition",
              args: [id],
            })
          }
          disabled={isPending || isConfirming || liquidatable}
          className="btn mt-4 w-full py-3"
        >
          {liquidatable
            ? "LIQUIDATABLE — CANNOT CLOSE"
            : isPending
              ? "CONFIRM IN WALLET…"
              : isConfirming
                ? "CLOSING…"
                : "CLOSE & CLAIM REWARDS"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  unit,
  accent,
  danger,
  border,
  bottom,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  danger?: boolean;
  border?: boolean;
  bottom?: boolean;
}) {
  return (
    <div
      className={`px-4 py-3 ${border ? "border-r border-[var(--color-border)]" : ""} ${
        bottom ? "border-b border-[var(--color-border)]" : ""
      }`}
    >
      <div className="label">{label}</div>
      <div
        className={`mt-1 text-sm font-bold ${
          accent ? "text-[var(--color-long)]" : danger ? "text-[var(--color-danger)]" : ""
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">{unit}</span>}
      </div>
    </div>
  );
}

function shorten(msg: string): string {
  const m = msg.match(/reverted with (?:the following reason|custom error)?:?\s*([^\n]+)/i);
  if (m) return m[1].slice(0, 120);
  return msg.split("\n")[0].slice(0, 120);
}
