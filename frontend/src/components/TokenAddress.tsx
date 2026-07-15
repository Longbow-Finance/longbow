"use client";

import { useState } from "react";
import { addresses, isConfigured } from "@/lib/contracts";
import { shortAddress } from "@/lib/format";

export function TokenAddress() {
  const addr = addresses.long;
  const configured = isConfigured(addr);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!configured) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="inline-flex items-stretch border border-[var(--color-border)] bg-[var(--color-panel)]">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <span className="label">$LONG TOKEN</span>
        <span className="mono text-sm">
          {configured ? (
            <>
              <span className="hidden sm:inline">{addr}</span>
              <span className="sm:hidden">{shortAddress(addr)}</span>
            </>
          ) : (
            <span className="text-[var(--color-muted)]">NOT DEPLOYED YET</span>
          )}
        </span>
      </div>
      <button
        onClick={copy}
        disabled={!configured}
        aria-label="Copy token address"
        title={configured ? "Copy address" : "Token not deployed yet"}
        className="flex items-center gap-1.5 border-l border-[var(--color-border)] px-3 text-[var(--color-muted)] transition hover:text-[var(--color-long)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[var(--color-muted)]"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span className="label">{copied ? "COPIED" : "COPY"}</span>
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="9" y="9" width="11" height="11" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
