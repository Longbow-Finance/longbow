"use client";

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TokenAddress } from "@/components/TokenAddress";
import { Stats } from "@/components/Stats";
import { OpenPosition } from "@/components/OpenPosition";
import { PositionsList } from "@/components/PositionsList";
import { usePositions } from "@/hooks/usePositions";
import { useProtocol } from "@/hooks/useProtocol";

export default function Dashboard() {
  const { positions, isLoading, connected, configured, refetch } = usePositions();
  const { priceWad } = useProtocol();

  return (
    <main className="min-h-screen pb-24">
      <Header />

      <div className="mx-auto max-w-6xl px-5">
        {/* Dashboard header */}
        <section className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--color-border)] py-10">
          <div>
            <div className="eyebrow">[ DASHBOARD ]</div>
            <h1 className="display mt-3 text-5xl md:text-6xl">TRADE THE LONG.</h1>
            <div className="mt-6">
              <TokenAddress />
            </div>
          </div>
          <div className="label flex flex-col gap-2 md:text-right">
            <span>NETWORK: ROBINHOOD CHAIN</span>
            <span>CHAIN ID: 4663</span>
            <span>GAS: ETH</span>
          </div>
        </section>

        {/* Protocol stats */}
        <section className="py-10">
          <div className="eyebrow mb-5">[ PROTOCOL ]</div>
          <Stats />
        </section>

        {/* Main grid */}
        <section className="grid items-start gap-8 pb-4 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
          {/* Left — open form */}
          <div className="lg:sticky lg:top-24">
            <ColHeader
              eyebrow="[ OPEN POSITION ]"
              title="Go long on LONG"
              right={
                <span className="label border border-[var(--color-border)] px-2.5 py-1.5">
                  NO TOKENS UP FRONT
                </span>
              }
            />
            <div className="mt-5">
              <OpenPosition onOpened={refetch} />
            </div>
          </div>

          {/* Right — positions */}
          <div>
            <ColHeader
              eyebrow="[ YOUR POSITIONS ]"
              title="Open longs"
              right={
                <div className="flex items-center gap-2">
                  <span className="live-dot inline-block h-2 w-2 bg-[var(--color-long)]" />
                  <span className="label">LIVE</span>
                </div>
              }
            />
            <div className="mt-5">
              <PositionsList
                positions={positions}
                isLoading={isLoading}
                connected={connected}
                configured={configured}
                priceWad={priceWad}
                onChanged={refetch}
              />
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}

function ColHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex h-[64px] items-end justify-between border-b border-[var(--color-border)] pb-4">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-2 text-xl font-bold">{title}</h2>
      </div>
      {right}
    </div>
  );
}
