// Kitchen measuring tools only mark off halves, thirds, quarters, and eighths.
// Any decimal result needs to land back on one of those before it's useful.
const KITCHEN_DENOMINATORS = [1, 2, 3, 4, 8];

export interface MixedNumber {
  whole: number;
  numerator: number;
  denominator: number;
}

function gcd(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x;
}

function reduce(mixed: MixedNumber): MixedNumber {
  if (mixed.numerator === 0) {
    return { whole: mixed.whole, numerator: 0, denominator: 1 };
  }
  const divisor = gcd(mixed.numerator, mixed.denominator);
  return {
    whole: mixed.whole,
    numerator: mixed.numerator / divisor,
    denominator: mixed.denominator / divisor,
  };
}

// Picks the nearest of 1/2, 1/3, 1/4, or 1/8 (or a whole number) instead of
// handing back something like 0.6666666666666666 cups.
export function roundToKitchenFraction(value: number): MixedNumber {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`cannot express ${value} as a kitchen fraction`);
  }

  const whole = Math.floor(value);
  const remainder = value - whole;

  let best: MixedNumber | undefined;
  let bestError = Infinity;

  for (const denominator of KITCHEN_DENOMINATORS) {
    let numerator = Math.round(remainder * denominator);
    let candidateWhole = whole;

    // Rounding the remainder up to a full unit (e.g. 7/8 -> 8/8) carries
    // into the whole part instead of leaving a fraction equal to one.
    if (numerator === denominator) {
      candidateWhole += 1;
      numerator = 0;
    }

    const approx = candidateWhole + (numerator === 0 ? 0 : numerator / denominator);
    const error = Math.abs(value - approx);

    if (error < bestError) {
      bestError = error;
      best = { whole: candidateWhole, numerator, denominator: numerator === 0 ? 1 : denominator };
    }
  }

  return reduce(best as MixedNumber);
}

// For ingredients you can't measure a fraction of - eggs, vanilla beans,
// slices of bread - snapping to the nearest whole number beats "3 1/2 eggs".
export function roundToWholeUnit(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`cannot express ${value} as a whole unit`);
  }
  return Math.round(value);
}

export function formatMixedNumber(mixed: MixedNumber): string {
  if (mixed.numerator === 0) {
    return String(mixed.whole);
  }
  if (mixed.whole === 0) {
    return `${mixed.numerator}/${mixed.denominator}`;
  }
  return `${mixed.whole} ${mixed.numerator}/${mixed.denominator}`;
}

// "1/2 cup" and "3/4 teaspoon" read as singular even though they aren't
// exactly one; "1 1/2 cups" reads as plural even though it starts with one.
// The rule recipe writers actually use: singular whenever the whole part is
// zero, or exactly one with no fraction attached.
export function isPluralQuantity(mixed: MixedNumber): boolean {
  return !(mixed.whole === 0 || (mixed.whole === 1 && mixed.numerator === 0));
}

// Abbreviations and units that don't take an "s" in kitchen usage.
const INVARIANT_UNITS = new Set([
  "tsp", "tbsp", "g", "kg", "mg", "ml", "l", "oz", "lb", "qt", "pt", "gal", "cm", "in",
]);

export function pluralizeUnit(unit: string, plural: boolean): string {
  if (unit === "" || !plural || INVARIANT_UNITS.has(unit)) {
    return unit;
  }
  if (/[^aeiou]y$/i.test(unit)) {
    return `${unit.slice(0, -1)}ies`;
  }
  if (/(s|x|z|ch|sh)$/i.test(unit)) {
    return `${unit}es`;
  }
  return `${unit}s`;
}

// Recipe text almost never has a decimal quantity typed in by a person -
// it's "1 1/2 cups" or "1½ cups", not "1.5 cups". These are the vulgar
// fraction glyphs whose denominators line up with KITCHEN_DENOMINATORS,
// since those are the ones a recipe (and a set of measuring cups) actually use.
const UNICODE_FRACTIONS: ReadonlyArray<[string, number, number]> = [
  ["¾", 3, 4],
  ["⅔", 2, 3],
  ["⅜", 3, 8],
  ["⅝", 5, 8],
  ["⅞", 7, 8],
  ["½", 1, 2],
  ["⅓", 1, 3],
  ["¼", 1, 4],
  ["⅛", 1, 8],
];

// Parses quantities as a person would type them into a recipe: whole
// numbers, decimals, simple fractions ("3/4"), mixed numbers ("1 1/2"),
// and mixed numbers written with a unicode vulgar fraction ("1½").
export function parseQuantity(input: string): number {
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new Error(`cannot parse "${input}" as a quantity`);
  }

  for (const [glyph, numerator, denominator] of UNICODE_FRACTIONS) {
    if (trimmed.endsWith(glyph)) {
      const wholePart = trimmed.slice(0, -glyph.length).trim();
      if (wholePart === "") {
        return numerator / denominator;
      }
      if (!/^\d+$/.test(wholePart)) {
        throw new Error(`cannot parse "${input}" as a quantity`);
      }
      return Number(wholePart) + numerator / denominator;
    }
  }

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, wholeStr, numeratorStr, denominatorStr] = mixedMatch;
    return Number(wholeStr) + parseFractionPart(input, numeratorStr, denominatorStr);
  }

  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, numeratorStr, denominatorStr] = fractionMatch;
    return parseFractionPart(input, numeratorStr, denominatorStr);
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new Error(`cannot parse "${input}" as a quantity`);
  }
  if (value < 0) {
    throw new RangeError(`quantity cannot be negative: "${input}"`);
  }
  return value;
}

function parseFractionPart(original: string, numeratorStr: string, denominatorStr: string): number {
  const denominator = Number(denominatorStr);
  if (denominator === 0) {
    throw new RangeError(`zero denominator in "${original}"`);
  }
  return Number(numeratorStr) / denominator;
}
