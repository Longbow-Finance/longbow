// Single source of truth for the litepaper. Rendered both as the web page
// (src/app/litepaper/page.tsx) and as the downloadable PDF (LitepaperPdf.tsx).

export type Block =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "formula"; text: string }
  | { type: "callout"; title?: string; lines: string[] };

export type Section = {
  id: string;
  n: string;
  title: string;
  blocks: Block[];
};

export type Run = { code: boolean; text: string };

/** Split a string into plain/code runs on backticks: "a `b` c" -> [a][b:code][c]. */
export function parseRuns(text: string): Run[] {
  const runs: Run[] = [];
  const parts = text.split("`");
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "") continue;
    runs.push({ code: i % 2 === 1, text: parts[i] });
  }
  return runs;
}

export const LITEPAPER_META = {
  title: "The Longbow Litepaper",
  version: "VERSION 0.1",
  chain: "ROBINHOOD CHAIN · ID 4663",
  status: "STATUS: DRAFT",
  intro:
    "A leveraged long on $LONG with no tokens up front, rewards paid from a finite reserve, and losses that permanently feed liquidity. This paper describes the full mechanism.",
};

export const SECTIONS: Section[] = [
  {
    id: "overview",
    n: "01",
    title: "Overview",
    blocks: [
      {
        type: "p",
        text: "Longbow lets anyone take a leveraged long position on the $LONG token by depositing ETH — without buying tokens up front. A depositor chooses a leverage multiplier and, as the price of $LONG rises, accrues reward tokens paid from a fixed reserve. When the position is closed the depositor reclaims their ETH equity plus any reward tokens earned. If the price falls too far, the position is liquidated and its collateral is contributed to the protocol's liquidity forever.",
      },
      {
        type: "p",
        text: "The design has three deliberate properties: depositors never receive tokens up front (removing immediate sell pressure), the reward pool is finite and fully pre-funded (removing dilution and insolvency risk), and every loss strengthens the liquidity pool (aligning individual risk with protocol health). Short positions are not supported.",
      },
    ],
  },
  {
    id: "token",
    n: "02",
    title: "The $LONG token",
    blocks: [
      {
        type: "p",
        text: "$LONG is a fixed-supply ERC-20. The entire supply is minted once at deployment and split 50 / 50:",
      },
      {
        type: "list",
        items: [
          "50% seeds the $LONG / WETH liquidity pool on a Uniswap V2-style DEX, establishing the market price.",
          "50% is transferred to the position contract, where it forms the reward reserve that pays profitable longs.",
        ],
      },
      {
        type: "p",
        text: "No further tokens can ever be minted. Because rewards are only ever paid from the pre-funded reserve, the protocol can never inflate the supply to cover payouts.",
      },
    ],
  },
  {
    id: "architecture",
    n: "03",
    title: "Architecture",
    blocks: [
      { type: "p", text: "The protocol is a small set of focused contracts plus an off-chain keeper:" },
      {
        type: "list",
        items: [
          "`LongToken` — the fixed-supply ERC-20. Mints once at genesis; no mint function thereafter.",
          "`PositionManager` — the core contract. Holds the reward reserve, opens/closes positions, computes rewards, equity and liquidation prices, and processes liquidations.",
          "`UniswapV2TwapOracle` — a time-weighted price oracle returning ETH per $LONG, resistant to flash-loan manipulation.",
          "`UniswapV2LiquiditySink` — receives forfeited collateral and locks it into the liquidity pool permanently.",
          "Keeper — an off-chain bot that refreshes the oracle and liquidates unhealthy positions for a bounty.",
        ],
      },
      {
        type: "p",
        text: "The `PositionManager` never holds $LONG for users and never mints; it only ever transfers reward tokens out of its own pre-funded balance.",
      },
    ],
  },
  {
    id: "positions",
    n: "04",
    title: "Opening a position",
    blocks: [
      {
        type: "p",
        text: "To open a long, a user sends ETH as collateral and selects a multiplier `m` between 1x and the protocol maximum. The contract records the entry price `P0` (ETH per $LONG, from the oracle) and reserves the maximum reward the position could ever earn:",
      },
      { type: "formula", text: "maxReward = collateral × m / P0" },
      {
        type: "p",
        text: "The user receives no tokens at this point. Their ETH is held as collateral inside the position contract; it is never swapped or lent out while the position is healthy. A minimum collateral amount is enforced to prevent dust and griefing.",
      },
    ],
  },
  {
    id: "rewards",
    n: "05",
    title: "Rewards",
    blocks: [
      {
        type: "p",
        text: "A position accrues reward tokens as the price rises above its entry. At any price `P ≥ P0` the claimable reward is:",
      },
      { type: "formula", text: "reward(P) = maxReward × (P − P0) / P" },
      {
        type: "p",
        text: "This is zero at entry, grows as the price climbs, and asymptotically approaches `maxReward` but never reaches it — so the earmarked reserve is always sufficient. Below the entry price the reward is zero; rewards never go negative.",
      },
    ],
  },
  {
    id: "solvency",
    n: "06",
    title: "Solvency & earmarking",
    blocks: [
      {
        type: "p",
        text: "When a position opens, exactly `maxReward` tokens are earmarked from the reserve, and the open is rejected unless the unearmarked reserve can cover it. Because every position's lifetime payout is strictly bounded by its earmark, the following invariant always holds:",
      },
      { type: "formula", text: "totalEarmarked ≤ reserveBalance" },
      {
        type: "p",
        text: "The sum of all possible payouts can therefore never exceed the reserve. There are no global loops and no dilution of existing positions: each long is independently pre-funded at the moment it opens.",
      },
    ],
  },
  {
    id: "payoff",
    n: "07",
    title: "Closing a position",
    blocks: [
      {
        type: "p",
        text: "A healthy position can be closed by its owner at any time. The payoff is a smooth leveraged long. First, mark-to-market equity is computed:",
      },
      { type: "formula", text: "equity = collateral × (1 + m × (P − P0) / P0)" },
      {
        type: "list",
        items: [
          "In profit: the ETH returned is capped at the original deposit, and the upside is delivered as reward tokens. You get your ETH back plus $LONG.",
          "Underwater: the ETH returned equals your reduced equity, and the shortfall (deposit − equity) is donated to the liquidity pool. No reward is paid below entry.",
        ],
      },
      {
        type: "p",
        text: "This makes losses continuous rather than all-or-nothing: an underwater exit realises exactly the loss the price implies, and that loss feeds liquidity immediately.",
      },
    ],
  },
  {
    id: "liquidation",
    n: "08",
    title: "Liquidation",
    blocks: [
      {
        type: "p",
        text: "If the price falls far enough that a position's equity drops to its maintenance margin, the position becomes liquidatable. The liquidation price is deterministic:",
      },
      { type: "formula", text: "P_liq = P0 × (1 − (1 − mm) / m)" },
      {
        type: "p",
        text: "where `mm` is the maintenance margin fraction. Higher multipliers push `P_liq` closer to the entry price, leaving less room for the price to fall. Anyone may call `liquidate`: the caller receives a bounty (a percentage of collateral) and the remaining collateral is donated to the liquidity pool. The position's reward is forfeited and its earmark released back to the reserve.",
      },
    ],
  },
  {
    id: "sink",
    n: "09",
    title: "The liquidity sink",
    blocks: [
      {
        type: "p",
        text: "Forfeited collateral — from liquidations and from the shortfall on underwater closes — is routed to a liquidity sink. The sink swaps half the ETH for $LONG, adds both legs as liquidity, and sends the resulting LP tokens to a burn address. The liquidity can therefore never be withdrawn by anyone, exactly matching the rule that a lost deposit permanently supports the pool.",
      },
    ],
  },
  {
    id: "examples",
    n: "10",
    title: "Worked examples",
    blocks: [
      {
        type: "p",
        text: "Assume an entry price of `P0 = 0.001 ETH` per $LONG and a maintenance margin of `mm = 25%`. A user deposits 1 ETH.",
      },
      {
        type: "callout",
        title: "EXAMPLE A — PROFITABLE EXIT (3x, price +40%)",
        lines: [
          "collateral   = 1 ETH",
          "m            = 3x",
          "P0           = 0.001 ETH   → maxReward = 1 × 3 / 0.001 = 3,000 LONG",
          "exit price P = 0.0014 ETH  (+40%)",
          "reward       = 3000 × (0.0014 − 0.001) / 0.0014 ≈ 857 LONG",
          "equity       = 1 × (1 + 3 × 0.40) = 2.2 ETH  → ETH back capped at 1.0 ETH",
          "RESULT       = 1 ETH returned + ~857 LONG claimed",
        ],
      },
      {
        type: "callout",
        title: "EXAMPLE B — UNDERWATER CLOSE (3x, price −10%)",
        lines: [
          "exit price P = 0.0009 ETH  (−10%)",
          "equity       = 1 × (1 + 3 × (−0.10)) = 0.70 ETH",
          "ETH back     = 0.70 ETH   (shortfall 0.30 ETH donated to the pool)",
          "reward       = 0 (below entry)",
        ],
      },
      {
        type: "callout",
        title: "EXAMPLE C — LIQUIDATION (3x)",
        lines: [
          "P_liq        = 0.001 × (1 − (1 − 0.25) / 3) = 0.00075 ETH  (−25%)",
          "at/below P_liq the position is liquidatable",
          "keeper bounty = e.g. 5% of collateral = 0.05 ETH to the caller",
          "donation      = 0.95 ETH permanently added to liquidity",
          "reward        = forfeited",
        ],
      },
    ],
  },
  {
    id: "oracle",
    n: "11",
    title: "Price oracle",
    blocks: [
      {
        type: "p",
        text: "All prices come from a Uniswap V2 time-weighted average price (TWAP) oracle, which averages the pool price over a fixed window and returns ETH per $LONG as an 18-decimal fixed-point value. Averaging over time makes the price resistant to single-block and flash-loan manipulation that could otherwise trigger unfair liquidations. The oracle must be refreshed periodically; keepers perform this alongside liquidations.",
      },
    ],
  },
  {
    id: "fees",
    n: "12",
    title: "Fees",
    blocks: [
      {
        type: "p",
        text: "Longbow charges no protocol fee, no funding rate, and no interest. The only value transfer beyond your own payoff is the liquidation bounty — paid by a liquidated position to whoever triggers its liquidation, never by healthy positions. Standard network gas applies as on any transaction.",
      },
    ],
  },
  {
    id: "keepers",
    n: "13",
    title: "Keepers & incentives",
    blocks: [
      {
        type: "p",
        text: "Two upkeep tasks are permissionless and incentivised so the protocol stays healthy without a privileged operator:",
      },
      {
        type: "list",
        items: [
          "Liquidations — anyone can liquidate an unhealthy position and earn the bounty, so under-margined positions are cleared promptly.",
          "Oracle updates — the TWAP must be poked to advance its window; keepers do this while scanning for liquidations.",
        ],
      },
      {
        type: "p",
        text: "A reference keeper bot is provided, but the incentives mean any independent party can perform these tasks.",
      },
    ],
  },
  {
    id: "trust",
    n: "14",
    title: "Trust assumptions & admin",
    blocks: [
      { type: "p", text: "The owner role is intentionally narrow. It can:" },
      {
        type: "list",
        items: [
          "Update the oracle and liquidity sink addresses.",
          "Adjust parameters (max multiplier, maintenance margin, liquidation bounty, minimum collateral) within hard-coded safety bounds.",
        ],
      },
      { type: "p", text: "The owner cannot:" },
      {
        type: "list",
        items: [
          "Mint new $LONG or withdraw the reward reserve.",
          "Touch user collateral, or change the entry price or earmark of an already-open position.",
          "Seize, pause, or confiscate positions.",
        ],
      },
      {
        type: "p",
        text: "Parameter changes only ever affect positions opened after the change. This bounds what a compromised or malicious owner could do.",
      },
    ],
  },
  {
    id: "params",
    n: "15",
    title: "Protocol parameters",
    blocks: [
      { type: "p", text: "The owner configures a small set of parameters, within safety bounds:" },
      {
        type: "list",
        items: [
          "Maximum multiplier — the highest leverage a position may select.",
          "Maintenance margin (bps) — the equity fraction at which a position becomes liquidatable.",
          "Liquidation bounty (bps) — the keeper's cut of a liquidated position's collateral; bounded by the maintenance margin.",
          "Minimum collateral — the smallest deposit accepted.",
        ],
      },
      {
        type: "p",
        text: "Live values are shown on the dashboard. Parameter changes never affect the earmark or entry price of already-open positions.",
      },
    ],
  },
  {
    id: "risks",
    n: "16",
    title: "Risk factors",
    blocks: [
      {
        type: "list",
        items: [
          "Price risk: a falling $LONG price reduces equity and can lead to liquidation and total loss of collateral.",
          "Leverage risk: higher multipliers accelerate both rewards and losses and move the liquidation price closer to entry.",
          "Smart-contract risk: the protocol is experimental software; bugs or economic exploits may exist.",
          "Oracle risk: extreme or sustained market conditions could still affect the TWAP.",
          "Liquidity risk: reward-token value depends on the depth of the $LONG liquidity pool.",
        ],
      },
    ],
  },
  {
    id: "disclaimer",
    n: "17",
    title: "Disclaimer",
    blocks: [
      {
        type: "p",
        text: "This document is for informational purposes only and is not financial, investment, or legal advice. $LONG is a utility token with no promise of profit. Leveraged positions can lose their entire collateral. Nothing here is an offer or solicitation to buy or sell any asset. Interact with the protocol only after understanding the risks and, where appropriate, seeking independent advice.",
      },
    ],
  },
];
