"use client";

import { useProtocol } from "@/hooks/useProtocol";
import { fmt, fmtMultiplier, fmtPrice } from "@/lib/format";

export function Stats() {
  const p = useProtocol();

  const items = [
    { tag: "PRICE", label: "LONG / ETH", value: p.priceWad ? fmtPrice(p.priceWad) : "–", accent: true },
    {
      tag: "RESERVE",
      label: "Reward reserve",
      value: p.reserveBalance !== undefined ? `${fmt(p.reserveBalance, 0)}` : "–",
      unit: "LONG",
    },
    {
      tag: "CAPACITY",
      label: "Available",
      value: p.availableReserve !== undefined ? `${fmt(p.availableReserve, 0)}` : "–",
      unit: "LONG",
    },
    { tag: "LEVERAGE", label: "Max multiplier", value: fmtMultiplier(p.maxMultiplierWad) },
  ];

  return (
    <section className="grid grid-cols-2 border border-[var(--color-border)] md:grid-cols-4">
      {items.map((it, i) => (
        <div
          key={it.tag}
          className={`px-5 py-6 ${i !== 0 ? "md:border-l md:border-[var(--color-border)]" : ""} ${
            i % 2 === 1 ? "border-l border-[var(--color-border)] md:border-l" : ""
          } ${i < 2 ? "border-b border-[var(--color-border)] md:border-b-0" : ""}`}
        >
          <div className="label text-[var(--color-long)]">[ {it.tag} ]</div>
          <div
            className={`mt-3 text-3xl font-bold tracking-tight ${it.accent ? "text-[var(--color-long)]" : ""}`}
          >
            {p.isLoading && !p.priceWad ? <span className="opacity-30">···</span> : it.value}
            {it.unit && <span className="ml-1.5 text-sm font-normal text-[var(--color-muted)]">{it.unit}</span>}
          </div>
          <div className="label mt-1.5 tracking-normal normal-case">{it.label}</div>
        </div>
      ))}
    </section>
  );
}
