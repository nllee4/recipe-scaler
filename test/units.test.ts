import { test } from "node:test";
import assert from "node:assert/strict";
import { convertQuantity, convertIngredientUnit, unitCategory } from "../src/units.js";

// Conversion factors are irrational-looking decimals in practice, so
// comparisons check "close enough for a kitchen", not bit-exact equality.
function assertClose(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: expected ${expected}, got ${actual}`);
}

test("unitCategory reports volume and weight, and undefined for unknown units", () => {
  assert.equal(unitCategory("cup"), "volume");
  assert.equal(unitCategory("g"), "weight");
  assert.equal(unitCategory("smidgen"), undefined);
});

test("convertQuantity converts within volume", () => {
  assertClose(convertQuantity(1, "tbsp", "tsp"), 3, "1 tbsp is 3 tsp");
  assertClose(convertQuantity(4, "tbsp", "cup"), 0.25, "4 tbsp is a quarter cup");
  assertClose(convertQuantity(1, "cup", "ml"), 236.5882365, "1 cup in ml");
  assertClose(convertQuantity(1, "gal", "qt"), 4, "1 gallon is 4 quarts");
});

test("convertQuantity converts within weight", () => {
  assertClose(convertQuantity(1, "lb", "oz"), 16, "1 lb is 16 oz");
  assertClose(convertQuantity(1000, "g", "kg"), 1, "1000 g is 1 kg");
  assertClose(convertQuantity(1, "kg", "lb"), 2.20462262, "1 kg in lb");
});

test("convertQuantity is a no-op when the unit doesn't change", () => {
  assert.equal(convertQuantity(2.5, "cup", "cup"), 2.5);
});

test("convertQuantity round-trips without drifting outside floating-point noise", () => {
  const original = 1.5;
  const roundTripped = convertQuantity(convertQuantity(original, "cup", "ml"), "ml", "cup");
  assertClose(roundTripped, original, "cup -> ml -> cup should return to the original value");
});

test("convertQuantity rejects unknown units", () => {
  assert.throws(() => convertQuantity(1, "smidgen", "cup"), /unknown unit/);
  assert.throws(() => convertQuantity(1, "cup", "smidgen"), /unknown unit/);
});

test("convertQuantity refuses to cross volume and weight without a density", () => {
  assert.throws(() => convertQuantity(1, "cup", "g"), /density/);
});

test("convertIngredientUnit converts quantity and swaps the unit, keeping everything else", () => {
  const flour = { name: "flour", quantity: 2, unit: "cup", scaling: "linear" as const };
  const converted = convertIngredientUnit(flour, "ml");
  assertClose(converted.quantity, 473.176473, "2 cups in ml");
  assert.equal(converted.unit, "ml");
  assert.equal(converted.name, "flour");
  assert.equal(converted.scaling, "linear");

  // the source ingredient must be untouched
  assert.equal(flour.unit, "cup");
  assert.equal(flour.quantity, 2);
});
