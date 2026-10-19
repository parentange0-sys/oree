import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_LEVEL,
  detectHit,
  parseLevel,
  parseLevels,
  readLevels,
  watchError,
  writeLevel,
  type Level,
} from "./levels.ts";

const armed: Level = {
  stop: 95,
  take: 106,
  armed: true,
  hit: null,
  hitAt: null,
  hitPrice: null,
};

describe("detectHit", () => {
  it("signale le stop puis le gain, bornes incluses", () => {
    assert.equal(detectHit(95, armed), "stop");
    assert.equal(detectHit(94.5, armed), "stop");
    assert.equal(detectHit(106, armed), "take");
    assert.equal(detectHit(120, armed), "take");
    assert.equal(detectHit(100, armed), null);
    assert.equal(detectHit(95.01, armed), null);
  });

  it("ignore une veille inactive, déjà touchée ou incohérente", () => {
    assert.equal(detectHit(90, { ...armed, armed: false }), null);
    assert.equal(detectHit(90, { ...armed, hit: "stop" }), null);
    assert.equal(detectHit(90, { ...armed, stop: null }), null);
    assert.equal(detectHit(200, { ...armed, stop: 300, take: 100 }), null);
    assert.equal(detectHit(Number.NaN, armed), null);
    assert.equal(detectHit(0, armed), null);
    assert.equal(detectHit(90, EMPTY_LEVEL), null);
  });
});

describe("watchError", () => {
  it("refuse un cours manquant ou des niveaux hors de la position longue", () => {
    assert.match(watchError(null, 90, 110) ?? "", /cours/);
    assert.match(watchError(100, null, 110) ?? "", /stop/);
    assert.match(watchError(100, 100, 110) ?? "", /sous le cours/);
    assert.match(watchError(100, 90, 100) ?? "", /sous le cours/);
    assert.match(watchError(100, 110, 90) ?? "", /sous le cours/);
    assert.equal(watchError(100, 95, 106), null);
  });
});

describe("parseLevels", () => {
  it("ignore le JSON corrompu et désarme un ordre impossible", () => {
    assert.deepEqual(parseLevels(null), {});
    assert.deepEqual(parseLevels("nope"), {});
    assert.deepEqual(parseLevels({ BTC: { stop: "95" } }), {});
    const parsed = parseLevel({
      stop: 110,
      take: 90,
      armed: true,
      hit: "stop",
      hitAt: 1,
      hitPrice: 80,
    });
    assert.ok(parsed);
    assert.equal(parsed?.armed, false);
    assert.equal(parsed?.hit, null);
    assert.equal(parsed?.stop, 110);
    const book = parseLevels({
      BTCUSDT: { stop: 90, take: 110, armed: true, hit: null },
      nope: { stop: 1, take: 2, armed: true },
      ETHUSDT: { stop: -1, take: 2, armed: true },
    });
    assert.deepEqual(Object.keys(book), ["BTCUSDT"]);
    assert.equal(book.BTCUSDT?.armed, true);
  });
});

describe("stockage local", () => {
  it("relit une veille enregistrée et survit à un stockage illisible", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { dispatchEvent: () => true },
    });

    assert.equal(writeLevel("BTCUSDT", armed), true);
    assert.equal(readLevels().BTCUSDT?.stop, 95);
    assert.equal(readLevels().BTCUSDT?.armed, true);

    store.set("oree-levels-v1", "{");
    assert.deepEqual(readLevels(), {});
  });
});
