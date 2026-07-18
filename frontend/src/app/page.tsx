import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Faq } from "@/components/Faq";
import { TokenAddress } from "@/components/TokenAddress";
import { TerminalCta } from "@/components/TerminalCta";
import { Quickstart } from "@/components/Quickstart";
import { HomeStats } from "@/components/HomeStats";

export default function Home() {
  return (
    <main className="min-h-screen pb-24">
      <Header />

      <div className="mx-auto max-w-6xl px-5">
        {/* Hero */}
        <section className="border-b border-[var(--color-border)] py-16 md:py-24">
          <div className="eyebrow">THE LEVERAGE LAYER FOR $LONG</div>
          <h1 className="display mt-5 text-5xl md:text-7xl">
            GO LONG.
            <br />
            <span className="text-[var(--color-long)]">EARN AS IT CLIMBS.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[var(--color-muted)]">
            Deposit ETH, pick a multiplier, and accrue LONG rewards as the price rises. Exit any
            time to reclaim your equity plus rewards. Fall too far and you&apos;re liquidated — your
            collateral feeds the pool. No shorts. No borrowing. No tokens up front.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="btn btn-primary flex items-center gap-2 px-5 py-3">
              OPEN DASHBOARD <span>{"\u2192"}</span>
            </Link>
            <Link href="#how" className="btn flex items-center gap-2 px-5 py-3">
              HOW IT WORKS
            </Link>
          </div>
          <div className="mt-6">
            <TokenAddress />
          </div>
          <div className="mt-8">
            <HomeStats />
          </div>
        </section>

        {/* Quickstart */}
        <Quickstart />

        {/* Mechanics */}
        <section id="how" className="py-14">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <div className="eyebrow">[ THE MECHANICS ]</div>
              <h2 className="display mt-3 text-3xl md:text-4xl">A long with no liquid to babysit.</h2>
            </div>
            <span className="label hidden md:block">3 PARTS</span>
          </div>

          <div className="grid border border-[var(--color-border)] bg-[var(--color-panel)] md:grid-cols-3">
            <Mechanic
              tag="COLLATERAL"
              title="Your ETH stays put."
              body="Deposits are held as collateral in the position contract — you receive no tokens up front. It only moves if you're liquidated, when it's donated to the pool forever."
            />
            <Mechanic
              tag="REWARDS"
              title="Tokens from a finite reserve."
              body="Half of supply seeds the reserve. As price rises you accrue LONG scaled by your gain and multiplier — earmarked at open, so the protocol is always solvent."
              border
            />
            <Mechanic
              tag="LIQUIDATION"
              title="Losses feed liquidity."
              body="Fall past your maintenance margin and anyone can liquidate you for a bounty. The rest of your collateral is added to the LONG liquidity pool, permanently."
              border
            />
          </div>

          {/* Litepaper + social */}
          <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <Link
              href="/litepaper"
              className="btn group flex w-full items-center justify-between gap-4 px-6 py-5"
            >
              <span className="flex items-center gap-4">
                <span className="mono flex h-9 w-9 flex-none items-center justify-center border border-[var(--color-border-bright)] text-[var(--color-long)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M4 3h11l5 5v13H4z" />
                    <path d="M14 3v6h6M8 13h8M8 17h5" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block text-sm font-bold tracking-[0.12em]">READ THE LITEPAPER</span>
                  <span className="label tracking-normal normal-case opacity-70">
                    The full mechanism — read online or download as PDF
                  </span>
                </span>
              </span>
              <span className="text-lg">{"\u2192"}</span>
            </Link>

            <a
              href="https://x.com/longbowfi"
              target="_blank"
              rel="noreferrer"
              className="btn group flex w-full items-center justify-between gap-4 px-6 py-5"
            >
              <span className="flex items-center gap-4">
                <span className="mono flex h-9 w-9 flex-none items-center justify-center border border-[var(--color-border-bright)] text-[var(--color-long)]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                  </svg>
                </span>
                <span className="text-left">
                  <span className="block text-sm font-bold tracking-[0.12em]">FOLLOW @LONGBOWFI</span>
                  <span className="label tracking-normal normal-case opacity-70">
                    Launch updates on X
                  </span>
                </span>
              </span>
              <span className="text-lg">{"\u2192"}</span>
            </a>
          </div>
        </section>

        {/* Pipeline */}
        <section id="pipeline" className="py-14">
          <div className="flex items-center justify-between">
            <span className="eyebrow">PIPELINE</span>
            <span className="label">EST. ~2 MIN</span>
          </div>
          <h2 className="display mt-4 text-3xl font-medium md:text-4xl">Get started with Longbow.</h2>

          <div className="mt-8 grid border border-[var(--color-border)] bg-[var(--color-panel)] md:grid-cols-2 lg:grid-cols-5">
            <Step
              n="01"
              title="Connect wallet"
              body="Connect on Robinhood Chain and you're ready to go."
              snippet="wallet.connect --chain 4663"
              last={false}
            />
            <Step
              n="02"
              title="Deposit ETH"
              body="Lock ETH as collateral. No tokens are minted to you."
              snippet="openPosition{value: 1 ETH}"
              last={false}
            />
            <Step
              n="03"
              title="Pick a multiplier"
              body="Choose your leverage. Higher means more reward, closer liquidation."
              snippet="multiplier = 2.5x"
              last={false}
            />
            <Step
              n="04"
              title="Earn as it climbs"
              body="Reward LONG accrues from the reserve as the price rises."
              snippet="reward = max·(P−P0)/P"
              last={false}
            />
            <Step
              n="05"
              title="Exit & settle"
              body="Close to reclaim equity and claim LONG. Underwater feeds the pool."
              snippet="closePosition(id) → ETH+LONG"
              last
            />
          </div>
        </section>

        {/* Terminal / CLI */}
        <TerminalCta />

        {/* CTA band */}
        <section className="framed panel mt-6 flex flex-col items-start justify-between gap-6 p-8 md:flex-row md:items-center">
          <div>
            <div className="eyebrow">[ READY ]</div>
            <h2 className="display mt-3 text-3xl md:text-4xl">
              Open your first long.
            </h2>
            <p className="mt-3 max-w-md text-[var(--color-muted)]">
              Everything interactive lives in the dashboard — open positions, live PnL, liquidation
              price, and one-click close & claim.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="btn btn-primary flex flex-none items-center gap-2 px-6 py-4"
          >
            OPEN DASHBOARD <span>{"\u2192"}</span>
          </Link>
        </section>

        {/* FAQ */}
        <Faq />
      </div>

      <Footer />
    </main>
  );
}

function Mechanic({
  tag,
  title,
  body,
  border,
}: {
  tag: string;
  title: string;
  body: string;
  border?: boolean;
}) {
  return (
    <div className={`p-6 ${border ? "border-t border-[var(--color-border)] md:border-t-0 md:border-l" : ""}`}>
      <div className="label text-[var(--color-long)]">[ {tag} ]</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{body}</p>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  snippet,
  last,
}: {
  n: string;
  title: string;
  body: string;
  snippet: string;
  last: boolean;
}) {
  return (
    <div
      className={`flex flex-col p-5 ${
        !last ? "border-b border-[var(--color-border)] lg:border-b-0 lg:border-r" : ""
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="label text-[var(--color-long)]">STEP {n}</span>
        {!last && <span className="text-[var(--color-muted)]">{"\u2192"}</span>}
      </div>
      <h3 className="text-base font-bold">{title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-[var(--color-muted)]">{body}</p>
      <div className="mono mt-4 border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 py-2 text-[11px] text-[var(--color-long)]">
        {snippet}
      </div>
    </div>
  );
}
