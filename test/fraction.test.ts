import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuantity, roundToWholeUnit, pluralizeUnit } from "../src/fraction.js";

test("parseQuantity reads whole numbers and decimals", () => {
  assert.equal(parseQuantity("2"), 2);
  assert.equal(parseQuantity("0"), 0);
  assert.equal(parseQuantity("1.5"), 1.5);
  assert.equal(parseQuantity("  3  "), 3);
});

test("parseQuantity reads simple and mixed fractions", () => {
  assert.equal(parseQuantity("1/2"), 0.5);
  assert.equal(parseQuantity("3/4"), 0.75);
  assert.equal(parseQuantity("1 1/2"), 1.5);
  assert.equal(parseQuantity("2  3/8"), 2.375);
});

test("parseQuantity reads unicode vulgar fractions, alone or attached to a whole number", () => {
  assert.equal(parseQuantity("½"), 0.5);
  assert.equal(parseQuantity("1½"), 1.5);
  assert.equal(parseQuantity("1 ½"), 1.5);
  assert.equal(parseQuantity("2¾"), 2.75);
});

test("roundToWholeUnit rounds to the nearest whole number", () => {
  assert.equal(roundToWholeUnit(3.4), 3);
  assert.equal(roundToWholeUnit(3.6), 4);
  assert.equal(roundToWholeUnit(3.5), 4);
  assert.equal(roundToWholeUnit(0), 0);
});

test("roundToWholeUnit rejects negative and non-finite values", () => {
  assert.throws(() => roundToWholeUnit(-1), RangeError);
  assert.throws(() => roundToWholeUnit(NaN), RangeError);
  assert.throws(() => roundToWholeUnit(Infinity), RangeError);
});

test("parseQuantity rejects garbage and nonsensical fractions", () => {
  assert.throws(() => parseQuantity(""), Error);
  assert.throws(() => parseQuantity("   "), Error);
  assert.throws(() => parseQuantity("a cup"), Error);
  assert.throws(() => parseQuantity("1/0"), RangeError);
  assert.throws(() => parseQuantity("-1"), RangeError);
});

test("pluralizeUnit leaves an empty unit or a singular quantity untouched", () => {
  assert.equal(pluralizeUnit("egg", false), "egg");
  assert.equal(pluralizeUnit("", true), "");
});

test("pluralizeUnit never adds an s to abbreviations", () => {
  assert.equal(pluralizeUnit("tsp", true), "tsp");
  assert.equal(pluralizeUnit("g", true), "g");
  assert.equal(pluralizeUnit("fl oz", true), "fl oz");
});

test("pluralizeUnit applies regular suffix rules", () => {
  assert.equal(pluralizeUnit("egg", true), "eggs");
  assert.equal(pluralizeUnit("clove", true), "cloves");
  assert.equal(pluralizeUnit("berry", true), "berries");
  assert.equal(pluralizeUnit("box", true), "boxes");
  assert.equal(pluralizeUnit("dash", true), "dashes");
  assert.equal(pluralizeUnit("pinch", true), "pinches");
});

test("pluralizeUnit special-cases units the suffix rules get wrong", () => {
  assert.equal(pluralizeUnit("leaf", true), "leaves");
  assert.equal(pluralizeUnit("loaf", true), "loaves");
  assert.equal(pluralizeUnit("half", true), "halves");
  assert.equal(pluralizeUnit("knife", true), "knives");
  assert.equal(pluralizeUnit("potato", true), "potatoes");
  assert.equal(pluralizeUnit("tomato", true), "tomatoes");
});
