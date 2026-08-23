import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scaleQuantity,
  scaleRecipe,
  formatQuantity,
  formatIngredient,
  type Recipe,
  type ScalingBehavior,
} from "../src/index.js";

test("scaleQuantity handles each scaling behavior", () => {
  const cases: Array<{
    description: string;
    quantity: number;
    factor: number;
    behavior: ScalingBehavior;
    expected: number;
  }> = [
    { description: "linear doubles cleanly", quantity: 2, factor: 3, behavior: "linear", expected: 6 },
    { description: "sqrt with a perfect square factor", quantity: 1, factor: 4, behavior: "sqrt", expected: 2 },
    { description: "fixed ignores the factor entirely", quantity: 1, factor: 10, behavior: "fixed", expected: 1 },
    { description: "zero (to taste) never scales", quantity: 0, factor: 100, behavior: "linear", expected: 0 },
    { description: "zero (to taste) ignores sqrt too", quantity: 0, factor: 100, behavior: "sqrt", expected: 0 },
  ];

  for (const { description, quantity, factor, behavior, expected } of cases) {
    assert.equal(scaleQuantity(quantity, factor, behavior), expected, description);
  }

  // sqrt growth trails off, so doubling the recipe should not double the salt.
  const doubled = scaleQuantity(1, 2, "sqrt");
  assert.equal(doubled, Math.sqrt(2));
  assert.ok(doubled < 2, "sqrt scaling must grow slower than linear scaling");
});

test("formatQuantity rounds to a kitchen-friendly fraction and pluralizes correctly", () => {
  const cases: Array<{ description: string; quantity: number; unit: string; expected: string }> = [
    { description: "exactly one is singular", quantity: 1, unit: "egg", expected: "1 egg" },
    { description: "whole numbers above one are plural", quantity: 2, unit: "egg", expected: "2 eggs" },
    { description: "a bare half cup stays singular", quantity: 0.5, unit: "cup", expected: "1/2 cup" },
    { description: "one and a half is plural despite the leading one", quantity: 1.5, unit: "cup", expected: "1 1/2 cups" },
    { description: "two thirds stays as a third, not an eighth", quantity: 2 / 3, unit: "cup", expected: "2/3 cup" },
    { description: "an eighth teaspoon rounds cleanly", quantity: 0.125, unit: "tsp", expected: "1/8 tsp" },
    { description: "abbreviations never pluralize", quantity: 3, unit: "tsp", expected: "3 tsp" },
    {
      description: "floating point drift from scaling still rounds to a clean whole number",
      quantity: (2 / 3) * 1.5,
      unit: "cup",
      expected: "1 cup",
    },
    {
      description: "sqrt-scaled salt lands on the nearest eighth, not a repeating decimal",
      quantity: scaleQuantity(1, 2, "sqrt"),
      unit: "tsp",
      expected: "1 3/8 tsp",
    },
  ];

  for (const { description, quantity, unit, expected } of cases) {
    assert.equal(formatQuantity(quantity, unit), expected, description);
  }
});

test("formatQuantity rounds to a whole number when the rounding mode is 'whole'", () => {
  const cases: Array<{ description: string; quantity: number; unit: string; expected: string }> = [
    { description: "rounds down to the nearest whole egg", quantity: 3.4, unit: "egg", expected: "3 eggs" },
    { description: "rounds up to the nearest whole egg", quantity: 3.6, unit: "egg", expected: "4 eggs" },
    { description: "exactly one whole unit is singular", quantity: 1, unit: "egg", expected: "1 egg" },
    { description: "rounding down to zero is still allowed", quantity: 0.4, unit: "egg", expected: "0 eggs" },
  ];

  for (const { description, quantity, unit, expected } of cases) {
    assert.equal(formatQuantity(quantity, unit, "whole"), expected, description);
  }
});

test("formatIngredient uses an ingredient's own rounding mode", () => {
  const eggs = { name: "", quantity: 3.5, unit: "egg", rounding: "whole" as const };
  assert.equal(formatIngredient(eggs), "4 eggs");
});

test("scaleRecipe carries a discrete ingredient's rounding mode through scaling", () => {
  const pancakes: Recipe = {
    name: "pancakes",
    servings: 4,
    ingredients: [{ name: "", quantity: 2, unit: "egg", rounding: "whole" }],
  };

  // 4 -> 7 servings gives a factor of 1.75, and 2 * 1.75 = 3.5 eggs, which
  // isn't a real quantity of eggs - it should round to a whole egg count.
  const scaled = scaleRecipe(pancakes, 7);
  assert.equal(formatIngredient(scaled.ingredients[0]), "4 eggs");
});

test("formatIngredient covers named amounts, unit-as-noun amounts, and to-taste amounts", () => {
  const cases: Array<{ description: string; ingredient: { name: string; quantity: number; unit: string }; expected: string }> = [
    {
      description: "a measured ingredient with a separate name",
      ingredient: { name: "flour", quantity: 1.5, unit: "cup" },
      expected: "1 1/2 cups flour",
    },
    {
      description: "a count noun where the unit is the ingredient itself",
      ingredient: { name: "", quantity: 2, unit: "egg" },
      expected: "2 eggs",
    },
    {
      description: "a to-taste ingredient never shows a quantity",
      ingredient: { name: "black pepper", quantity: 0, unit: "tsp" },
      expected: "black pepper (to taste)",
    },
  ];

  for (const { description, ingredient, expected } of cases) {
    assert.equal(formatIngredient(ingredient), expected, description);
  }
});

test("scaleRecipe applies each ingredient's own scaling behavior without mutating the input", () => {
  const pancakes: Recipe = {
    name: "pancakes",
    servings: 4,
    ingredients: [
      { name: "flour", quantity: 2, unit: "cup" },
      { name: "salt", quantity: 1, unit: "tsp", scaling: "sqrt" },
      { name: "", quantity: 1, unit: "vanilla bean", scaling: "fixed" },
      { name: "black pepper", quantity: 0, unit: "tsp" },
    ],
  };

  const scaled = scaleRecipe(pancakes, 6);

  assert.equal(scaled.servings, 6);
  assert.equal(formatIngredient(scaled.ingredients[0]), "3 cups flour");
  assert.equal(formatIngredient(scaled.ingredients[1]), "1 1/4 tsp salt");
  assert.equal(formatIngredient(scaled.ingredients[2]), "1 vanilla bean");
  assert.equal(formatIngredient(scaled.ingredients[3]), "black pepper (to taste)");

  // The source recipe must be untouched, since a caller might scale it
  // more than once (4 -> 6, then separately 4 -> 2).
  assert.equal(pancakes.servings, 4);
  assert.equal(pancakes.ingredients[0].quantity, 2);
});

test("scaleRecipe rejects nonsensical serving counts", () => {
  const soup: Recipe = {
    name: "soup",
    servings: 4,
    ingredients: [{ name: "broth", quantity: 1, unit: "l" }],
  };

  assert.throws(() => scaleRecipe(soup, 0), RangeError);
  assert.throws(() => scaleRecipe(soup, -2), RangeError);
  assert.throws(() => scaleRecipe({ ...soup, servings: 0 }, 4), RangeError);
});
