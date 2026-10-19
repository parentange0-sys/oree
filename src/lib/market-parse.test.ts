import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { biasOf, decodeEntities, isLeveraged, mapRows, readTicker } from "./market-parse.ts";

describe("decodeEntities", () => {
  it("décode les entités RSS sans les laisser telles quelles", () => {
    assert.equal(decodeEntities("Bitcoin &amp; Ethereum"), "Bitcoin & Ethereum");
    assert.equal(decodeEntities("&lt;tag&gt;"), "<tag>");
    assert.equal(decodeEntities("It&#39;s &quot;BTC&quot;"), `It's "BTC"`);
    assert.equal(decodeEntities("<![CDATA[Solana &amp; co]]>"), "Solana & co");
    assert.equal(decodeEntities("A &amp;amp; B"), "A &amp; B");
  });
});

describe("mapRows", () => {
  const payload = [
    {
      symbol: "BTCUPUSDT",
      lastPrice: "10",
      highPrice: "12",
      lowPrice: "8",
      priceChangePercent: "1",
      quoteVolume: "999",
    },
    {
      symbol: "ETHBTC",
      lastPrice: "0.05",
      highPrice: "0.06",
      lowPrice: "0.04",
      priceChangePercent: "1",
      quoteVolume: "10",
    },
    {
      symbol: "SOLUSDT",
      lastPrice: "100",
      highPrice: "110",
      lowPrice: "90",
      priceChangePercent: "0",
      quoteVolume: "50",
    },
    {
      symbol: "BTCUSDT",
      lastPrice: "100",
      highPrice: "110",
      lowPrice: "90",
      priceChangePercent: "4",
      quoteVolume: "80",
    },
    {
      symbol: "BADUSDT",
      lastPrice: "0",
      highPrice: "1",
      lowPrice: "1",
      priceChangePercent: "1",
      quoteVolume: "10",
    },
    {
      symbol: "XRPUSDT",
      lastPrice: "1",
      highPrice: "0",
      lowPrice: "-1",
      priceChangePercent: "-4.5",
      quoteVolume: "-20",
    },
  ];

  it("garde le spot USDT, écarte le levier et trie par volume", () => {
    assert.equal(isLeveraged("BTCUP"), true);
    assert.equal(isLeveraged("BTC"), false);
    const rows = mapRows(payload);
    assert.deepEqual(
      rows.map((row) => row.symbol),
      ["BTCUSDT", "SOLUSDT", "XRPUSDT"],
    );
    const btc = rows[0];
    assert.ok(btc);
    assert.equal(btc.changePct, 4);
    assert.equal(btc.rangePos, 0.5);
    assert.equal(btc.bias, "hausse");
    const sol = rows[1];
    assert.equal(sol?.changePct, 0);
    assert.equal(sol?.bias, "range");
    const xrp = rows[2];
    assert.equal(xrp?.high, 1);
    assert.equal(xrp?.low, 1);
    assert.equal(xrp?.quoteVolume, 0);
    assert.equal(xrp?.rangePos, 0.5);
    assert.equal(xrp?.bias, "baisse");
  });

  it("refuse une charge utile inattendue", () => {
    assert.throws(() => mapRows({}), /inattendue/);
  });
});

describe("readTicker", () => {
  it("lit un cours, conserve un zéro et rejette une paire inconnue", () => {
    const quote = readTicker(
      {
        lastPrice: "104.08",
        priceChangePercent: "0",
        highPrice: "110",
        lowPrice: "0",
        openPrice: "100",
        quoteVolume: "12",
        bidPrice: "104",
        askPrice: "104.1",
      },
      "SOLUSDT",
      1_700_000_000_000,
    );
    assert.equal(quote.ok, true);
    if (!quote.ok) return;
    assert.equal(quote.price, 104.08);
    assert.equal(quote.changePct, 0);
    assert.equal(quote.low, 104.08);
    assert.equal(quote.at, 1_700_000_000_000);

    const missing = readTicker({ code: -1121, msg: "Invalid symbol." }, "NOPEUSDT", 1);
    assert.deepEqual(missing, {
      ok: false,
      error: "Cette paire n’est pas cotée en spot USDT sur Binance.",
    });
    assert.equal(readTicker([], "BTCUSDT").ok, false);
    assert.equal(readTicker({ lastPrice: "0" }, "BTCUSDT").ok, false);
  });
});

describe("biasOf", () => {
  it("demande un mouvement et une place dans le range", () => {
    assert.equal(biasOf(2, 0.62), "hausse");
    assert.equal(biasOf(2, 0.5), "range");
    assert.equal(biasOf(4, 0.1), "hausse");
    assert.equal(biasOf(-2, 0.38), "baisse");
    assert.equal(biasOf(-2, 0.5), "range");
    assert.equal(biasOf(-4, 0.9), "baisse");
  });
});
