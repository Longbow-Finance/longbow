import { lime, limeBold, dim, gray } from "./theme.js";

// 5-row block glyphs for the wordmark.
const FONT: Record<string, string[]> = {
  L: ["\u2588    ", "\u2588    ", "\u2588    ", "\u2588    ", "\u2588\u2588\u2588\u2588\u2588"],
  O: ["\u2588\u2588\u2588\u2588\u2588", "\u2588   \u2588", "\u2588   \u2588", "\u2588   \u2588", "\u2588\u2588\u2588\u2588\u2588"],
  N: ["\u2588   \u2588", "\u2588\u2588  \u2588", "\u2588 \u2588 \u2588", "\u2588  \u2588\u2588", "\u2588   \u2588"],
  G: ["\u2588\u2588\u2588\u2588\u2588", "\u2588    ", "\u2588  \u2588\u2588", "\u2588   \u2588", "\u2588\u2588\u2588\u2588\u2588"],
  B: ["\u2588\u2588\u2588\u2588 ", "\u2588   \u2588", "\u2588\u2588\u2588\u2588 ", "\u2588   \u2588", "\u2588\u2588\u2588\u2588 "],
  W: ["\u2588   \u2588", "\u2588   \u2588", "\u2588 \u2588 \u2588", "\u2588\u2588 \u2588\u2588", "\u2588   \u2588"],
};

function wordmark(word: string): string {
  const rows = ["", "", "", "", ""];
  for (const ch of word) {
    const g = FONT[ch];
    if (!g) continue;
    for (let r = 0; r < 5; r++) rows[r] += g[r] + "  ";
  }
  return rows.map((r) => limeBold(r)).join("\n");
}

const BOW = [
  "        )\\",
  "       /  \\",
  "      /    )",
  "     |     |>=================>",
  "      \\    )",
  "       \\  /",
  "        )/",
];

export function banner(): string {
  const bow = BOW.map((l) => lime(l)).join("\n");
  return [
    "",
    bow,
    "",
    wordmark("LONGBOW"),
    "",
    "  " + dim("LEVERAGED LONGS ON $LONG") + gray("  \u00b7  ") + dim("ROBINHOOD CHAIN \u00b7 4663"),
    "  " + dim("an experiment. self-run by its community."),
    "",
  ].join("\n");
}
