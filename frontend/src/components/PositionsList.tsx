"use client";

import type { UserPosition } from "@/hooks/usePositions";
import { PositionCard } from "./PositionCard";

export function PositionsList({
  positions,
  isLoading,
  connected,
  configured,
  priceWad,
  onChanged,
}: {
  positions: UserPosition[];
  isLoading: boolean;
  connected: boolean;
  configured: boolean;
  priceWad?: bigint;
  onChanged: () => void;
}) {
  const empty =
    !configured ||
    !connected ||
    (positions.length === 0 && !isLoading) ||
    (positions.length === 0 && isLoading);

  return (
    <div id="positions">
      {!configured && (
        <Empty>
          Set the contract addresses in{" "}
          <span className="text-[var(--color-long)]">.env.local</span> to load positions.
        </Empty>
      )}

      {configured && !connected && <Empty>Connect your wallet to see your longs.</Empty>}

      {configured && connected && positions.length === 0 && !isLoading && (
        <Empty>No open positions yet. Open your first long on the left.</Empty>
      )}

      {configured && connected && isLoading && positions.length === 0 && (
        <Empty>Loading positions…</Empty>
      )}

      {!empty && (
        <div className="grid gap-4">
          {positions.map((up) => (
            <PositionCard key={up.id.toString()} up={up} priceWad={priceWad} onClosed={onChanged} />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel framed mono flex min-h-[420px] items-center justify-center px-6 py-12 text-center text-sm leading-relaxed text-[var(--color-muted)]">
      <span className="max-w-xs">{children}</span>
    </div>
  );
}
