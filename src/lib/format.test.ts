import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  distancePct,
  formatPct,
  formatPrice,
  formatRatio,
  movePrice,
  parsePx,
  roundPrice,
  spreadPct,
  toInput,
} from "./format.ts";

describe("parsePx", () => {
  it("accepte le point, la virgule et les espaces", () => {
    assert.equal(parsePx("104.08"), 104.08);
    assert.equal(parsePx("104,08"), 104.08);
    assert.equal(parsePx("  82\u202f086,30 "), 82086.3);
    assert.equal(parsePx("1 234,5"), 1234.5);
    assert.equal(parsePx(",5"), 0.5);
  });

  it("rejette vide, nul, négatif et le texte", () => {
    assert.equal(parsePx(""), null);
    assert.equal(parsePx("   "), null);
    assert.equal(parsePx("0"), null);
    assert.equal(parsePx("0,0"), null);
    assert.equal(parsePx("-1"), null);
    assert.equal(parsePx("abc"), null);
    assert.equal(parsePx("1,2,3"), null);
    assert.equal(parsePx("Infinity"), null);
    assert.equal(parsePx("1e2"), null);
    assert.equal(parsePx("NaN"), null);
  });
});

describe("prix et pourcentages", () => {
  it("arrondit le stop et le gain avec les décimales du cours", () => {
    assert.equal(movePrice(100, -5), 95);
    assert.equal(movePrice(100, 6), 106);
    assert.equal(movePrice(104.08, -5), 98.88);
    assert.equal(movePrice(104.08, 6), 110.32);
    assert.equal(movePrice(82_086.3, -5), 77_981.99);
    assert.equal(movePrice(0, -5), null);
    assert.equal(movePrice(10, Number.NaN), null);
    assert.equal(movePrice(-4, 6), null);
  });

  it("mesure la distance en pourcentage", () => {
    assert.equal(distancePct(100, 95), -5);
    assert.equal(distancePct(100, 106), 6);
    assert.equal(distancePct(0, 1), null);
    assert.equal(distancePct(100, Number.NaN), null);
    const price = 104.08;
    const stop = movePrice(price, -5);
    assert.ok(stop != null);
    const distance = distancePct(price, stop);
    assert.ok(distance != null);
    assert.ok(Math.abs(distance - -5) < 0.02);
  });

  it("formate en français et se relit", () => {
    assert.match(formatPrice(82_086.3), /82.086,30/);
    assert.equal(formatPrice(104.08), "104,08");
    assert.equal(formatPrice(0.00000403), "0,00000403");
    assert.equal(parsePx(formatPrice(82_086.3)), 82086.3);
    assert.equal(parsePx(toInput(104.08)), 104.08);
    assert.equal(parsePx(toInput(0.00000403)), roundPrice(0.00000403));
    assert.equal(formatPct(0.89), "+0,89 %");
    assert.equal(formatPct(-5), "-5,00 %");
    assert.equal(formatPct(0), "0,00 %");
    assert.equal(formatRatio(6, 5), "1,2");
  });

  it("ignore un carnet croisé", () => {
    const spread = spreadPct(100, 100.2, 100.1);
    assert.ok(spread != null && Math.abs(spread - 0.2) < 0.001);
    assert.equal(spreadPct(101, 100, 100), null);
    assert.equal(spreadPct(0, 1, 1), null);
  });
});
