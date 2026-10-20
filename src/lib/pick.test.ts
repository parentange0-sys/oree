import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bestCall, callFor, WHEN_LABEL, type Verdict } from "./pick.ts";
import type { MarketRow } from "./market.ts";

function row(partial: Partial<MarketRow> = {}): MarketRow {
  return {
    symbol: "BTCUSDT",
    base: "BTC",
    price: 100,
    changePct: 2,
    high: 110,
    low: 90,
    quoteVolume: 20_000_000,
    rangePos: 0.5,
    bias: "hausse",
    ...partial,
  };
}

const VERDICTS: Verdict[] = ["ouvert", "neutre", "ecarte"];

describe("callFor", () => {
  it("décrit une lecture de filtre, sans pourcentage de confiance", () => {
    const open = callFor(row());
    assert.equal(open.verdict, "ouvert");
    assert.equal("confidence" in open, false);
    assert.equal(WHEN_LABEL.ouvert, "Ouverte");

    const stretched = callFor(row({ changePct: 14, rangePos: 0.95 }));
    assert.equal(stretched.verdict, "ecarte");
    assert.equal(WHEN_LABEL.ecarte, "Écartée");

    const waiting = callFor(row({ changePct: -8, rangePos: 0.1 }));
    assert.equal(waiting.verdict, "neutre");
    assert.equal(WHEN_LABEL.neutre, "Neutre");
  });

  it("n’emploie pas une formule d’ordre ou de probabilité", () => {
    const samples = VERDICTS.map((verdict) => {
      if (verdict === "ouvert") return callFor(row());
      if (verdict === "ecarte") return callFor(row({ changePct: 14, rangePos: 0.95 }));
      return callFor(row({ changePct: -8, rangePos: 0.1 }));
    });
    const blob = samples
      .flatMap((call) => [call.why, call.note, WHEN_LABEL[call.verdict]])
      .join("\n")
      .toLowerCase();
    for (const phrase of [
      "confiance",
      "maintenant",
      "pas encore",
      "ne pas entrer",
      "prends",
      "achète",
      "achetez",
      "suis-la",
      "tu ",
      "position longue",
    ]) {
      assert.equal(blob.includes(phrase), false, phrase);
    }
  });
});

describe("bestCall", () => {
  it("retient la paire au score le plus haut parmi les volumes utilisables", () => {
    const quiet = row({
      symbol: "SOLUSDT",
      base: "SOL",
      changePct: 1,
      rangePos: 0.9,
      quoteVolume: 9_000_000,
    });
    const louder = row({ changePct: 3, rangePos: 0.55, quoteVolume: 40_000_000 });
    const picked = bestCall([
      quiet,
      louder,
      row({ symbol: "ETHUSDT", base: "ETH", quoteVolume: 12_000_000, changePct: 0, rangePos: 0.5 }),
      row({
        symbol: "XRPUSDT",
        base: "XRP",
        quoteVolume: 11_000_000,
        changePct: 9,
        rangePos: 0.95,
      }),
      row({
        symbol: "ADAUSDT",
        base: "ADA",
        quoteVolume: 10_000_000,
        changePct: -1,
        rangePos: 0.4,
      }),
    ]);
    assert.equal(picked?.symbol, "BTCUSDT");
  });
});
