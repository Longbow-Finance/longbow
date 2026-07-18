"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TICKER_ITEMS = [
  "$LONG IS LIVE ON ROBINHOOD CHAIN",
  "NO SHORTS",
  "NO TOKENS UP FRONT",
  "LOSSES FEED THE POOL",
  "DEPOSIT ETH · PICK A MULTIPLIER · EARN LONG",
];

export function Header() {
  const pathname = usePathname();
  const onDashboard = pathname?.startsWith("/dashboard");

  return (
    <>
      {/* Top ticker */}
      <div className="overflow-hidden border-b border-[var(--color-long)] bg-[var(--color-long)] text-[#0a0b0a]">
        <div className="ticker-track py-1.5 text-xs font-semibold tracking-[0.18em]">
          {[0, 1].map((dup) => (
            <span key={dup} className="flex" aria-hidden={dup === 1}>
              {TICKER_ITEMS.map((t, i) => (
                <span key={`${dup}-${i}`} className="mono flex items-center px-6">
                  {t} <span className="px-3">{"\u2192"}</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[rgba(8,9,10,0.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="flex items-center gap-3">
            <LongbowMark />
            <div className="leading-none">
              <div className="text-base font-bold tracking-tight">LONGBOW</div>
              <div className="label mt-1">FINANCE</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link className="label hover:text-[var(--color-long)]" href="/#how">
              HOW IT WORKS
            </Link>
            <Link className="label hover:text-[var(--color-long)]" href="/#start">
              GET STARTED
            </Link>
            <Link className="label hover:text-[var(--color-long)]" href="/dashboard">
              DASHBOARD
            </Link>
            <a
              className="label hover:text-[var(--color-long)]"
              href="https://robinhoodchain.blockscout.com"
              target="_blank"
              rel="noreferrer"
            >
              EXPLORER
            </a>
            <a
              className="label hover:text-[var(--color-long)]"
              href="https://x.com/longbowfi"
              target="_blank"
              rel="noreferrer"
            >
              X
            </a>
          </nav>

          {onDashboard ? (
            <WalletButton />
          ) : (
            <Link href="/dashboard" className="btn btn-primary flex items-center gap-2 px-5 py-3">
              DASHBOARD <span>{"\u2192"}</span>
            </Link>
          )}
        </div>
      </header>
    </>
  );
}

function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" } })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className="btn btn-primary flex items-center gap-2 px-5 py-3"
                  >
                    CONNECT WALLET <span>{"\u2192"}</span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} className="btn flex items-center gap-2 px-5 py-3">
                    WRONG NETWORK <span>{"\u2192"}</span>
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="btn btn-primary flex items-center gap-2 px-5 py-3"
                >
                  {account.displayName}
                  {account.displayBalance ? ` · ${account.displayBalance}` : ""}
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}

function LongbowMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center bg-[var(--color-long)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/longbow-icon.png" alt="Longbow" className="h-6 w-6 object-contain" />
    </div>
  );
}
