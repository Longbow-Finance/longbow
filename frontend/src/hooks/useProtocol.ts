"use client";

import { useReadContracts } from "wagmi";
import { addresses, isConfigured, oracleAbi, positionManagerAbi } from "@/lib/contracts";

export type Protocol = {
  priceWad?: bigint;
  maxMultiplierWad?: bigint;
  minCollateral?: bigint;
  maintenanceMarginBps?: bigint;
  reserveBalance?: bigint;
  availableReserve?: bigint;
  totalEarmarked?: bigint;
  nextPositionId?: bigint;
  isLoading: boolean;
  configured: boolean;
};

export function useProtocol(): Protocol {
  const pm = addresses.positionManager;
  const oracle = addresses.oracle;
  const configured = isConfigured(pm) && isConfigured(oracle);

  const { data, isLoading } = useReadContracts({
    query: { enabled: configured },
    contracts: [
      { address: oracle, abi: oracleAbi, functionName: "priceWad" },
      { address: pm, abi: positionManagerAbi, functionName: "maxMultiplierWad" },
      { address: pm, abi: positionManagerAbi, functionName: "minCollateral" },
      { address: pm, abi: positionManagerAbi, functionName: "maintenanceMarginBps" },
      { address: pm, abi: positionManagerAbi, functionName: "reserveBalance" },
      { address: pm, abi: positionManagerAbi, functionName: "availableReserve" },
      { address: pm, abi: positionManagerAbi, functionName: "totalEarmarked" },
      { address: pm, abi: positionManagerAbi, functionName: "nextPositionId" },
    ],
  });

  const val = (i: number) =>
    data?.[i]?.status === "success" ? (data[i].result as bigint) : undefined;

  return {
    priceWad: val(0),
    maxMultiplierWad: val(1),
    minCollateral: val(2),
    maintenanceMarginBps: val(3),
    reserveBalance: val(4),
    availableReserve: val(5),
    totalEarmarked: val(6),
    nextPositionId: val(7),
    isLoading,
    configured,
  };
}
