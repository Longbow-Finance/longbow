import { lime, limeBold, dim, bold, white, gray, rule } from "./theme.js";

function p(s: string): string {
  // simple wrap at ~76 cols, indented 2
  const words = s.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > 76) {
      lines.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines.map((l) => "  " + l).join("\n");
}

export function howItWorks(): string {
  return [
    "",
    lime("[ HOW IT WORKS ]"),
    bold("  Go long on $LONG. Earn as it climbs."),
    "",
    p("You deposit ETH as collateral and pick a multiplier. You receive no tokens up front. As the price of $LONG rises, you accrue reward tokens paid from a finite, pre-funded reserve."),
    "",
    `  ${limeBold("01")}  ${white("Deposit ETH")}`,
    p("   Held as collateral in the position contract. Never lent out while your position is healthy."),
    "",
    `  ${limeBold("02")}  ${white("Pick a multiplier")}`,
    p("   Higher leverage accrues rewards faster as price rises — and pushes your liquidation price closer to entry."),
    "",
    `  ${limeBold("03")}  ${white("Earn as it climbs")}`,
    p("   reward(P) = maxReward x (P - P0) / P, where maxReward = collateral x m / P0. Zero at entry, approaching maxReward as price grows."),
    "",
    `  ${limeBold("04")}  ${white("Exit anytime")}`,
    p("   In profit: reclaim your deposit in ETH plus your reward tokens. Underwater: reclaim your reduced equity; the shortfall feeds the pool. No reward below entry."),
    "",
    `  ${limeBold("05")}  ${white("Liquidation")}`,
    p("   If equity falls to the maintenance margin, anyone can liquidate you for a bounty. The rest of your collateral is added to the liquidity pool, permanently. Reward is forfeited."),
    "",
    gray("  No shorts. No borrowing. No interest. No tokens up front."),
    "",
    rule(),
  ].join("\n");
}

export function aboutJan(): string {
  return [
    "",
    lime("[ ABOUT LITTLE JAN ]"),
    "",
    p("Every archer keeps company. Robin had his forest, his aim, and a friend who never asked for the spotlight — Little Jan."),
    "",
    p("Little Jan does not lead. He does not make speeches. He tends the string, keeps the bow dry, and is there at dawn whether anyone is watching or not. He is the quiet hand behind a steady shot."),
    "",
    p("Longbow carries that spirit. The protocol has no captain to cheer it on, no promises whispered to keep you calm. It simply works — patiently, on its own — the way Little Jan always did. If you go looking for a leader here, you will only find the mechanism, and the people who chose to keep it."),
    "",
    gray("  \u201cThe best help makes no noise.\u201d"),
    "",
    rule(),
  ].join("\n");
}

export function ethos(): string {
  return [
    "",
    lime("[ THE EXPERIMENT ]"),
    "",
    p("Longbow was built out of technical interest. It is an experiment — the same word that once described a great many things that later became difficult to ignore. We make no claim about which kind this will be."),
    "",
    p("There will be a single announcement: one post, one article, everything you need to understand the design and the risks. After that, the account goes quiet. The contracts are already finished; they do not require our attention to keep running."),
    "",
    p("We will not court a community. We will not manufacture urgency, hint at rewards, or promise a future to soothe anyone afraid a project cannot live without noise. Those things are for people selling something. We are not."),
    "",
    p("What remains is open, verifiable, and entirely in your hands. Read the code. Read the litepaper. Decide for yourself. If Longbow endures, it will be because its holders chose to carry it — not because anyone asked them to."),
    "",
    gray("  Announcement: one tweet, one article. Then silence, by design."),
    gray("  Self-custodial. Self-run. Community-owned."),
    "",
    rule(),
  ].join("\n");
}
