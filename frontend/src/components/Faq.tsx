const ITEMS: { q: string; a: string }[] = [
  {
    q: "What is Longbow?",
    a: "Longbow is a protocol on Robinhood Chain that lets you take a leveraged long on the $LONG token by depositing ETH — without buying tokens up front. As the price climbs you accrue $LONG rewards; when you exit you reclaim your equity plus those rewards.",
  },
  {
    q: "What is the $LONG token?",
    a: "$LONG is the protocol's fixed-supply ERC-20. Half of the total supply seeds the liquidity pool and the other half funds the reward reserve that pays out to profitable longs. No more can ever be minted.",
  },
  {
    q: "What does \u201cgoing long\u201d actually mean here?",
    a: "You deposit ETH as collateral and pick a multiplier. Your position gains value as $LONG's price rises and loses value as it falls — like a leveraged long — but your upside is paid in $LONG reward tokens rather than in more ETH.",
  },
  {
    q: "Do I receive $LONG tokens when I deposit?",
    a: "No. You get no tokens up front. Your ETH is held as collateral, and you only receive $LONG rewards when you close a position that is in profit.",
  },
  {
    q: "Where do the reward tokens come from?",
    a: "From a finite reward reserve — 50% of total supply held by the position contract. Rewards are never minted on demand; they are paid out of this fixed pool.",
  },
  {
    q: "How are rewards calculated?",
    a: "Your reward scales with how far the price has risen since you opened and with your multiplier: reward = maxReward \u00d7 (P \u2212 P0) / P, where maxReward = collateral \u00d7 multiplier / entry price. The higher it climbs, the closer you get to your max reward.",
  },
  {
    q: "What is the multiplier?",
    a: "It is your leverage. A higher multiplier means you accrue rewards faster as the price rises — but it also pushes your liquidation price closer to your entry, leaving less room for the price to fall before you are liquidated.",
  },
  {
    q: "What is the maximum multiplier?",
    a: "It is capped by the protocol and shown live on the dashboard as \u201cMax leverage.\u201d You can choose anything from 1x up to that cap.",
  },
  {
    q: "What happens when I close a position in profit?",
    a: "You reclaim your ETH equity (capped at your original deposit) and claim your accrued $LONG reward tokens — all in a single transaction.",
  },
  {
    q: "What happens if I close while underwater?",
    a: "You get back your current equity, which is less than your deposit. The shortfall is donated to the liquidity pool. Positions below their entry price earn no reward.",
  },
  {
    q: "What is liquidation?",
    a: "If the price falls far enough that your equity drops to the maintenance margin, your position can be liquidated. You forfeit your reward, and your remaining collateral is permanently added to the liquidity pool.",
  },
  {
    q: "What is my liquidation price?",
    a: "It is the price at which your equity hits the maintenance margin. It is shown before you open and on every open position. Higher multipliers give a higher (closer) liquidation price.",
  },
  {
    q: "What happens to my collateral if I get liquidated?",
    a: "A small keeper bounty is paid to whoever triggers the liquidation, and the rest of your collateral is donated to the $LONG liquidity pool — forever. It is never returned.",
  },
  {
    q: "Can I open a short position?",
    a: "No. Longbow only supports longs. There is no way to bet on the price going down.",
  },
  {
    q: "Is there any borrowing or interest to pay?",
    a: "No. There are no loans, no funding rates, and no interest. Your only risk is the price falling toward your liquidation level.",
  },
  {
    q: "Which network is Longbow on?",
    a: "Robinhood Chain — an Arbitrum Orbit L2 (chain ID 4663) that uses ETH for gas.",
  },
  {
    q: "How is the price determined? Can it be manipulated?",
    a: "The protocol uses a Uniswap V2 time-weighted average price (TWAP) oracle, which averages price over a window. This makes it resistant to single-block and flash-loan manipulation that could otherwise trigger unfair liquidations.",
  },
  {
    q: "Is the reward reserve always solvent?",
    a: "Yes. When you open a position, the maximum reward you could ever earn is earmarked from the reserve, and opens are refused if the reserve cannot cover it. Total earmarked rewards never exceed the reserve, so every payout is fully backed.",
  },
  {
    q: "Is there a minimum deposit?",
    a: "Yes — a small minimum collateral is enforced to prevent dust and griefing. The exact minimum is shown on the open form.",
  },
  {
    q: "Who can liquidate positions, and why would they?",
    a: "Anyone can run a keeper. Liquidators earn a bounty (a percentage of the liquidated collateral) as an incentive to keep the system healthy.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="eyebrow">[ FAQ ]</div>
          <h2 className="display mt-3 text-3xl md:text-4xl">Questions, answered.</h2>
        </div>
        <span className="label hidden md:block">{ITEMS.length} ENTRIES</span>
      </div>

      <div className="border border-[var(--color-border)] bg-[var(--color-panel)]">
        {ITEMS.map((it, i) => (
          <details key={i} className="group border-b border-[var(--color-border)] last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="mono flex-none text-xs text-[var(--color-muted)] transition-colors group-open:text-[var(--color-long)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-base font-bold">{it.q}</span>
              <span className="flex h-5 w-5 flex-none items-center justify-center text-[var(--color-long)] transition-transform duration-200 group-open:rotate-45">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <p className="pb-5 pl-[52px] pr-12 text-sm leading-relaxed text-[var(--color-muted)]">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
