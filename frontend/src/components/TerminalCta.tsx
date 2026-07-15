"use client";

import { useState } from "react";

const INSTALL_CMD = "npx longbow-cli";
const RELEASES_URL = "https://github.com/Longbow-Protocol/longbow/releases";
const REPO_URL = "https://github.com/Longbow-Protocol/longbow/tree/main/cli";

export function TerminalCta() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_CMD);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section id="terminal" className="py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">[ TERMINAL ]</div>
          <h2 className="display mt-3 text-3xl md:text-4xl">Prefer the command line?</h2>
        </div>
        <span className="label hidden md:block">SELF-CUSTODIAL</span>
      </div>

      <div className="grid border border-[var(--color-border)] bg-[var(--color-panel)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Copy */}
        <div className="p-6 md:p-8">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            Everything on the dashboard also runs in your terminal — check stats, open and close
            longs, and view positions. It runs entirely on your machine and signs locally, so your
            private key never leaves your computer and never touches a server.
          </p>
          <ul className="mt-5 space-y-2.5">
            <Bullet>Direct-to-chain via the public Robinhood Chain RPC</Bullet>
            <Bullet>Keys stay in memory for the session — never stored, never sent</Bullet>
            <Bullet>No account, no sign-up, no backend</Bullet>
          </ul>
        </div>

        {/* Install */}
        <div className="flex flex-col justify-center gap-5 border-t border-[var(--color-border)] p-6 md:p-8 lg:border-l lg:border-t-0">
          <div>
            <div className="label mb-2">RUN IT (NODE 18+)</div>
            <div className="flex items-stretch border border-[var(--color-border)] bg-[var(--color-bg)]">
              <div className="flex flex-1 items-center gap-2.5 px-4 py-3">
                <span className="mono text-[var(--color-long)]">$</span>
                <span className="mono text-sm">{INSTALL_CMD}</span>
              </div>
              <button
                onClick={copy}
                aria-label="Copy install command"
                title="Copy command"
                className="flex items-center gap-1.5 border-l border-[var(--color-border)] px-3 text-[var(--color-muted)] transition hover:text-[var(--color-long)]"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                <span className="label">{copied ? "COPIED" : "COPY"}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="label mb-2">OR DOWNLOAD A BINARY (NO NODE NEEDED)</div>
            <div className="flex flex-wrap gap-2">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn flex items-center gap-2 px-4 py-3"
              >
                RELEASES <span>{"\u2192"}</span>
              </a>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn flex items-center gap-2 px-4 py-3"
              >
                SOURCE <span>{"\u2192"}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-[var(--color-fg)]">
      <span className="mono mt-0.5 flex-none text-[var(--color-long)]">›</span>
      <span>{children}</span>
    </li>
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
