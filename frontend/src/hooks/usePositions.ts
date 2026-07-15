"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import {
  addresses,
  isConfigured,
  positionManagerAbi,
  type Position,
} from "@/lib/contracts";

export type UserPosition = {
  id: bigint;
  position: Position;
  equity?: bigint;
  reward?: bigint;
  liquidationPrice?: bigint;
  liquidatable?: boolean;
};

/**
 * Loads every position id, keeps the caller's open ones, then fetches live
 * equity / reward / liquidation data for each. Uses batched reads (Multicall3).
 */
export function usePositions() {
  const { address } = useAccount();
  const pm = addresses.positionManager;
  const configured = isConfigured(pm);

  const { data: nextIdData, refetch: refetchCount } = useReadContract({
    address: pm,
    abi: positionManagerAbi,
    functionName: "nextPositionId",
    query: { enabled: configured },
  });

  const count = nextIdData ? Number(nextIdData) : 0;

  const ids = useMemo(() => Array.from({ length: count }, (_, i) => BigInt(i)), [count]);

  const { data: rawPositions, isLoading: loadingPositions } = useReadContracts({
    query: { enabled: configured && count > 0 },
    contracts: ids.map((id) => ({
      address: pm,
      abi: positionManagerAbi,
      functionName: "getPosition" as const,
      args: [id] as const,
    })),
  });

  const ownedIds = useMemo(() => {
    if (!rawPositions || !address) return [] as { id: bigint; position: Position }[];
    const lower = address.toLowerCase();
    const out: { id: bigint; position: Position }[] = [];
    rawPositions.forEach((r, i) => {
      if (r.status !== "success") return;
      const p = r.result as unknown as Position;
      if (p.open && p.owner.toLowerCase() === lower) {
        out.push({ id: ids[i], position: p });
      }
    });
    return out;
  }, [rawPositions, address, ids]);

  const { data: liveData, isLoading: loadingLive, refetch: refetchLive } = useReadContracts({
    query: { enabled: configured && ownedIds.length > 0 },
    contracts: ownedIds.flatMap(({ id }) => [
      { address: pm, abi: positionManagerAbi, functionName: "positionEquity" as const, args: [id] as const },
      { address: pm, abi: positionManagerAbi, functionName: "pendingReward" as const, args: [id] as const },
      { address: pm, abi: positionManagerAbi, functionName: "liquidationPrice" as const, args: [id] as const },
      { address: pm, abi: positionManagerAbi, functionName: "isLiquidatable" as const, args: [id] as const },
    ]),
  });

  const positions: UserPosition[] = useMemo(() => {
    return ownedIds.map(({ id, position }, i) => {
      const base = i * 4;
      const pick = (o: number) =>
        liveData?.[base + o]?.status === "success" ? liveData[base + o].result : undefined;
      return {
        id,
        position,
        equity: pick(0) as bigint | undefined,
        reward: pick(1) as bigint | undefined,
        liquidationPrice: pick(2) as bigint | undefined,
        liquidatable: pick(3) as boolean | undefined,
      };
    });
  }, [ownedIds, liveData]);

  const refetch = () => {
    refetchCount();
    refetchLive();
  };

  return {
    positions,
    isLoading: loadingPositions || loadingLive,
    configured,
    connected: Boolean(address),
    refetch,
  };
}
