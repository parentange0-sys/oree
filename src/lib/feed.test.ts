import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { feedLabel, feedStatus, unwrapOk } from "./feed.ts";

const now = 1_000_000;

describe("feedStatus", () => {
  it("distingue chargement, direct, périmé, hors ligne et erreur", () => {
    assert.equal(
      feedStatus({
        hasData: false,
        updatedAt: null,
        now,
        online: true,
        failed: false,
        freshMs: 15_000,
      }),
      "loading",
    );
    assert.equal(
      feedStatus({
        hasData: false,
        updatedAt: null,
        now,
        online: true,
        failed: true,
        freshMs: 15_000,
      }),
      "error",
    );
    assert.equal(
      feedStatus({
        hasData: false,
        updatedAt: null,
        now,
        online: false,
        failed: true,
        freshMs: 15_000,
      }),
      "offline",
    );
    assert.equal(
      feedStatus({
        hasData: true,
        updatedAt: now - 5_000,
        now,
        online: true,
        failed: false,
        freshMs: 15_000,
      }),
      "live",
    );
    assert.equal(
      feedStatus({
        hasData: true,
        updatedAt: now - 15_000,
        now,
        online: true,
        failed: false,
        freshMs: 15_000,
      }),
      "live",
    );
    assert.equal(
      feedStatus({
        hasData: true,
        updatedAt: now - 15_001,
        now,
        online: true,
        failed: false,
        freshMs: 15_000,
      }),
      "stale",
    );
    assert.equal(
      feedStatus({
        hasData: true,
        updatedAt: now - 1_000,
        now,
        online: true,
        failed: true,
        freshMs: 15_000,
      }),
      "stale",
    );
    assert.equal(
      feedStatus({
        hasData: true,
        updatedAt: now,
        now,
        online: false,
        failed: false,
        freshMs: 15_000,
      }),
      "offline",
    );
  });

  it("nomme les états en français", () => {
    assert.equal(feedLabel("live"), "En direct");
    assert.equal(feedLabel("stale"), "Périmé");
    assert.equal(feedLabel("offline"), "Hors ligne");
    assert.equal(feedLabel("error"), "Indisponible");
    assert.equal(feedLabel("loading"), "Chargement");
  });
});

describe("unwrapOk", () => {
  it("garde le succès et lève l’erreur métier", () => {
    assert.deepEqual(unwrapOk({ ok: true, price: 1 }), { ok: true, price: 1 });
    assert.throws(() => unwrapOk({ ok: false, error: "Binance est injoignable pour le moment." }), {
      message: "Binance est injoignable pour le moment.",
    });
  });
});
