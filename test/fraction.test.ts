import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuantity } from "../src/fraction.js";

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

test("parseQuantity rejects garbage and nonsensical fractions", () => {
  assert.throws(() => parseQuantity(""), Error);
  assert.throws(() => parseQuantity("   "), Error);
  assert.throws(() => parseQuantity("a cup"), Error);
  assert.throws(() => parseQuantity("1/0"), RangeError);
  assert.throws(() => parseQuantity("-1"), RangeError);
});
