import { test } from "node:test";
import assert from "node:assert/strict";
import { convertQuantity, convertIngredientUnit, unitCategory } from "../src/units.js";
import { densityOf } from "../src/density.js";

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

test("convertQuantity crosses volume and weight when given a density", () => {
  // water is exactly 1 g/ml, so 1 cup of it should come out to the cup's
  // own ml figure.
  assertClose(convertQuantity(1, "cup", "g", 1), 236.5882365, "1 cup of water in g");
  assertClose(convertQuantity(236.5882365, "g", "cup", 1), 1, "236.588 g of water in cups");

  // all-purpose flour is lighter than water, so the same volume weighs less.
  assertClose(convertQuantity(1, "cup", "g", 0.53), 125.391765345, "1 cup of flour in g");
});

test("convertQuantity rejects a non-positive density", () => {
  assert.throws(() => convertQuantity(1, "cup", "g", 0), RangeError);
  assert.throws(() => convertQuantity(1, "cup", "g", -1), RangeError);
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

test("convertIngredientUnit looks up density from the ingredient's name when crossing categories", () => {
  const flour = { name: "all-purpose flour", quantity: 1, unit: "cup" };
  const converted = convertIngredientUnit(flour, "g");
  assertClose(converted.quantity, 125.391765345, "1 cup of all-purpose flour in g");
});

test("convertIngredientUnit prefers an explicit density over the name lookup", () => {
  // named "water" but converted with honey's density instead
  const water = { name: "water", quantity: 1, unit: "cup" };
  const converted = convertIngredientUnit(water, "g", densityOf("honey"));
  assertClose(converted.quantity, 236.5882365 * 1.42, "1 cup converted at honey's density");
});

test("convertIngredientUnit still throws when the name isn't in the density table", () => {
  const mystery = { name: "smidgen of magic", quantity: 1, unit: "cup" };
  assert.throws(() => convertIngredientUnit(mystery, "g"), /density/);
});

test("densityOf looks up known ingredients case-insensitively and trims whitespace", () => {
  assert.equal(densityOf("water"), 1);
  assert.equal(densityOf("  Honey "), 1.42);
  assert.equal(densityOf("ALL-PURPOSE FLOUR"), 0.53);
  assert.equal(densityOf("unobtanium"), undefined);
});

test("densityOf covers common dairy, spreads, and baking ingredients", () => {
  assert.equal(densityOf("cornmeal"), 0.58);
  assert.equal(densityOf("coconut oil"), 0.92);
  assert.equal(densityOf("peanut butter"), 1.1);
  assert.equal(densityOf("sour cream"), 1.01);
  assert.equal(densityOf("Yogurt"), 1.04);
  assert.equal(densityOf("buttermilk"), 1.04);
  assert.equal(densityOf("heavy cream"), 0.98);
  assert.equal(densityOf("cream cheese"), 0.96);
});
