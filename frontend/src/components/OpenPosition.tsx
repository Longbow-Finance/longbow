"use client";

import { useEffect, useMemo, useState } from "react";
import { parseEther, formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { addresses, positionManagerAbi } from "@/lib/contracts";
import { useProtocol } from "@/hooks/useProtocol";
import { fmt, fmtPrice, WAD } from "@/lib/format";

const BPS = 10_000n;

function computeEarmark(collateral: bigint, multiplierWad: bigint, priceWad: bigint): bigint {
  if (priceWad === 0n) return 0n;
  return (collateral * multiplierWad) / priceWad;
}

function computeLiqPrice(entryWad: bigint, multiplierWad: bigint, mmBps: bigint): bigint {
  if (multiplierWad === 0n) return 0n;
  const mmWad = (mmBps * WAD) / BPS;
  const oneMinusMm = WAD - mmWad;
  const term = (oneMinusMm * WAD) / multiplierWad;
  if (term >= WAD) return 0n;
  const factor = WAD - term;
  return (entryWad * factor) / WAD;
}

export function OpenPosition({ onOpened }: { onOpened?: () => void }) {
  const { address, isConnected } = useAccount();
  const p = useProtocol();
  const { data: balance } = useBalance({ address });

  const [amount, setAmount] = useState("");
  const [multiplier, setMultiplier] = useState(2);

  const maxMult = p.maxMultiplierWad ? Number(formatEther(p.maxMultiplierWad)) : 10;

  const { collateralWei, parseError } = useMemo(() => {
    if (!amount) return { collateralWei: 0n, parseError: "" };
    try {
      return { collateralWei: parseEther(amount), parseError: "" };
    } catch {
      return { collateralWei: 0n, parseError: "Invalid amount" };
    }
  }, [amount]);

  const multiplierWad = useMemo(() => parseEther(multiplier.toString()), [multiplier]);

  const preview = useMemo(() => {
    if (!p.priceWad || collateralWei === 0n) return undefined;
    const earmark = computeEarmark(collateralWei, multiplierWad, p.priceWad);
    const liq = computeLiqPrice(p.priceWad, multiplierWad, p.maintenanceMarginBps ?? 0n);
    return { earmark, liq };
  }, [p.priceWad, p.maintenanceMarginBps, collateralWei, multiplierWad]);

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && txHash) {
      onOpened?.();
      setAmount("");
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, txHash]);

  const belowMin =
    p.minCollateral !== undefined && collateralWei > 0n && collateralWei < p.minCollateral;
  const overBalance = balance ? collateralWei > balance.value : false;
  const overCapacity =
    preview && p.availableReserve !== undefined ? preview.earmark > p.availableReserve : false;

  const disabled =
    !isConnected ||
    !p.configured ||
    collateralWei === 0n ||
    Boolean(parseError) ||
    belowMin ||
    overBalance ||
    overCapacity ||
    isPending ||
    isConfirming;

  const submit = () => {
    if (disabled) return;
    writeContract({
      address: addresses.positionManager,
      abi: positionManagerAbi,
      functionName: "openPosition",
      args: [multiplierWad],
      value: collateralWei,
    });
  };

  const rewardAt50 =
    preview && p.priceWad
      ? (preview.earmark * ((p.priceWad * 3n) / 2n - p.priceWad)) / ((p.priceWad * 3n) / 2n)
      : undefined;

  return (
    <div className="panel framed p-6" id="open">
      {/* Amount */}
      <div className="label mb-2">DEPOSIT / ETH COLLATERAL</div>
      <div className="flex items-center gap-2 border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3.5">
        <input
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="w-full bg-transparent text-2xl font-medium outline-none placeholder:text-[var(--color-muted)]"
        />
        <span className="mono text-sm text-[var(--color-muted)]">ETH</span>
        {balance && (
          <button
            onClick={() => setAmount(formatEther((balance.value * 99n) / 100n))}
            className="btn px-2 py-1 text-[var(--color-long)]"
          >
            MAX
          </button>
        )}
      </div>
      <div className="mt-1.5 flex justify-between">
        <span className="label tracking-normal normal-case">
          {p.minCollateral !== undefined ? `Min ${fmt(p.minCollateral, 4)} ETH` : "\u00a0"}
        </span>
        <span className="label tracking-normal normal-case">
          {balance ? `Balance ${fmt(balance.value, 4)} ETH` : "\u00a0"}
        </span>
      </div>

      {/* Multiplier */}
      <div className="mt-7 mb-3 flex items-center justify-between">
        <div className="label">MULTIPLIER</div>
        <span className="text-2xl font-bold text-[var(--color-long)]">{multiplier.toFixed(1)}x</span>
      </div>
      <input
        type="range"
        min={1}
        max={Math.max(2, Math.floor(maxMult))}
        step={0.1}
        value={multiplier}
        onChange={(e) => setMultiplier(Number(e.target.value))}
        className="w-full"
      />
      <div className="mt-1.5 flex justify-between">
        <span className="label tracking-normal">1x</span>
        <span className="label tracking-normal">{Math.max(2, Math.floor(maxMult))}x MAX</span>
      </div>

      {/* Preview */}
      <div className="mt-7 grid grid-cols-2 border border-[var(--color-border)]">
        <Preview label="ENTRY PRICE" value={p.priceWad ? `${fmtPrice(p.priceWad)}` : "–"} border />
        <Preview
          label="LIQUIDATION"
          value={preview ? `${fmtPrice(preview.liq)}` : "–"}
          danger
        />
        <Preview
          label="MAX REWARD"
          value={preview ? `${fmt(preview.earmark, 2)}` : "–"}
          unit="LONG"
          accent
          border
          top
        />
        <Preview label="REWARD @ +50%" value={rewardAt50 !== undefined ? `${fmt(rewardAt50, 2)}` : "–"} unit="LONG" top />
      </div>

      {/* Validation / status */}
      <div className="mt-3 min-h-[20px] text-sm">
        {!p.configured && (
          <span className="mono text-[var(--color-warn)]">
            Contracts not configured — set addresses in .env.local
          </span>
        )}
        {parseError && <span className="mono text-[var(--color-danger)]">{parseError}</span>}
        {belowMin && <span className="mono text-[var(--color-danger)]">Below minimum collateral.</span>}
        {overBalance && <span className="mono text-[var(--color-danger)]">Amount exceeds balance.</span>}
        {overCapacity && (
          <span className="mono text-[var(--color-danger)]">
            Exceeds available reward capacity — lower amount or multiplier.
          </span>
        )}
        {writeError && <span className="mono text-[var(--color-danger)]">{shortenError(writeError.message)}</span>}
        {isConfirming && <span className="mono text-[var(--color-muted)]">Confirming transaction…</span>}
      </div>

      <button onClick={submit} disabled={disabled} className="btn btn-primary mt-3 flex w-full items-center justify-center gap-2 py-4">
        {!isConnected
          ? "CONNECT WALLET TO LONG"
          : isPending
            ? "CONFIRM IN WALLET…"
            : isConfirming
              ? "OPENING…"
              : "OPEN LONG POSITION"}
        {isConnected && !isPending && !isConfirming && <span>{"\u2192"}</span>}
      </button>
    </div>
  );
}

function Preview({
  label,
  value,
  unit,
  accent,
  danger,
  border,
  top,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: boolean;
  danger?: boolean;
  border?: boolean;
  top?: boolean;
}) {
  return (
    <div
      className={`px-4 py-4 ${border ? "border-r border-[var(--color-border)]" : ""} ${
        top ? "border-t border-[var(--color-border)]" : ""
      }`}
    >
      <div className="label">{label}</div>
      <div
        className={`mt-1.5 text-lg font-bold ${
          accent ? "text-[var(--color-long)]" : danger ? "text-[var(--color-danger)]" : ""
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">{unit}</span>}
      </div>
    </div>
  );
}

function shortenError(msg: string): string {
  const m = msg.match(/reverted with (?:the following reason|custom error)?:?\s*([^\n]+)/i);
  if (m) return m[1].slice(0, 120);
  return msg.split("\n")[0].slice(0, 120);
}
