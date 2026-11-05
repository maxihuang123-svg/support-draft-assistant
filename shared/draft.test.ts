import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDraft } from "./draft.ts";

test("eigene versendete Bestellung: Status + Liefertermin", () => {
  const r = buildDraft("lena@demo.de", "Hallo, wann kommt meine Bestellung A-1001?");
  assert.match(r.draft, /versendet/);
  assert.match(r.draft, /26\.10\.2026/);
  assert.equal(r.needsReview, false);
});

test("fremde Bestellung: keine Daten, gleicher Text wie unbekannt", () => {
  const foreign = buildDraft("lena@demo.de", "Wo ist A-1002?");
  const unknown = buildDraft("lena@demo.de", "Wo ist A-9999?");
  assert.doesNotMatch(foreign.draft, /in Bearbeitung|tom@/);
  assert.equal(foreign.draft.replace("A-1002", "X"), unknown.draft.replace("A-9999", "X"));
  assert.equal(foreign.matches[0].result, "foreign");
  assert.equal(foreign.needsReview, true);
});

test("Storno: Verweis auf Kundenservice, keine Zusage", () => {
  const r = buildDraft("lena@demo.de", "Ich möchte A-1003 stornieren");
  assert.equal(r.intent, "storno_erstattung");
  assert.match(r.draft, /Kundenservice prüft/);
  assert.equal(r.needsReview, true);
});

test("Erstattung wird ebenfalls erkannt", () => {
  const r = buildDraft("lena@demo.de", "Bekomme ich mein Geld zurück für A1003?");
  assert.equal(r.intent, "storno_erstattung");
  assert.deepEqual(r.orderIds, ["A-1003"]);
});

test("keine Bestellnummer: Rückfrage", () => {
  const r = buildDraft("tom@demo.de", "Wo bleibt meine Bestellung?");
  assert.match(r.draft, /Bestellnummer/);
  assert.equal(r.matches.length, 0);
});

test("in Bearbeitung ohne Termin: kein erfundenes Datum", () => {
  const r = buildDraft(" Tom@Demo.de ", "Status von a-1002?");
  assert.match(r.draft, /in Bearbeitung/);
  assert.doesNotMatch(r.draft, /\d{2}\.\d{2}\.\d{4}/);
});

test("zugestellt", () => {
  const r = buildDraft("lena@demo.de", "Wo ist A-1003?");
  assert.match(r.draft, /am 20\.10\.2026 zugestellt/);
});
