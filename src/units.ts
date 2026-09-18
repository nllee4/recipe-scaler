import type { Ingredient } from "./index.js";
import { densityOf } from "./density.js";

export type UnitCategory = "volume" | "weight";

interface UnitDefinition {
  category: UnitCategory;
  // How many base units (milliliters for volume, grams for weight) one of
  // this unit is worth. Converting is always "multiply into the base unit,
  // then divide out of it" rather than a conversion table per unit pair.
  toBase: number;
}

// US customary volumes and metric mass/volume, since that covers what a
// home recipe is actually written in. Fluid ounces are kept distinct from
// weight ounces ("fl oz" vs "oz") because they aren't the same unit and
// silently treating them as interchangeable would produce a wrong answer,
// not just an unfamiliar one.
// US customary, at their exact legal/standard definitions rather than a
// rounded approximation - e.g. 1 lb is exactly 453.59237 g, and everything
// else in each category is an exact multiple of that unit's base value.
const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  ml: { category: "volume", toBase: 1 },
  l: { category: "volume", toBase: 1000 },
  tsp: { category: "volume", toBase: 4.92892159375 },
  tbsp: { category: "volume", toBase: 14.78676478125 },
  "fl oz": { category: "volume", toBase: 29.5735295625 },
  cup: { category: "volume", toBase: 236.5882365 },
  pt: { category: "volume", toBase: 473.176473 },
  qt: { category: "volume", toBase: 946.352946 },
  gal: { category: "volume", toBase: 3785.411784 },

  g: { category: "weight", toBase: 1 },
  kg: { category: "weight", toBase: 1000 },
  oz: { category: "weight", toBase: 28.349523125 },
  lb: { category: "weight", toBase: 453.59237 },
};

export function unitCategory(unit: string): UnitCategory | undefined {
  return UNIT_DEFINITIONS[unit]?.category;
}

// Converts between units of the same kind (volume-to-volume or
// weight-to-weight) unconditionally. Crossing volume and weight needs an
// ingredient's density in grams per milliliter - without one, this throws
// rather than guessing.
export function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  gramsPerMilliliter?: number,
): number {
  if (fromUnit === toUnit) {
    return quantity;
  }

  const from = UNIT_DEFINITIONS[fromUnit];
  const to = UNIT_DEFINITIONS[toUnit];
  if (!from) {
    throw new Error(`unknown unit: "${fromUnit}"`);
  }
  if (!to) {
    throw new Error(`unknown unit: "${toUnit}"`);
  }

  const fromBase = quantity * from.toBase;

  if (from.category === to.category) {
    return fromBase / to.toBase;
  }

  if (gramsPerMilliliter === undefined) {
    throw new Error(
      `cannot convert "${fromUnit}" (${from.category}) to "${toUnit}" (${to.category}) without an ingredient density`,
    );
  }
  if (!(gramsPerMilliliter > 0)) {
    throw new RangeError(`gramsPerMilliliter must be greater than zero, got ${gramsPerMilliliter}`);
  }

  // fromBase is already in ml (volume) or g (weight); density is what
  // bridges the two base units, in whichever direction is needed.
  const toBase = from.category === "volume" ? fromBase * gramsPerMilliliter : fromBase / gramsPerMilliliter;
  return toBase / to.toBase;
}

// Same conversion, applied to a whole ingredient. Scaling and rounding mode
// carry over untouched since neither depends on which unit is used. When
// crossing volume and weight, an explicit gramsPerMilliliter wins; otherwise
// this falls back to looking the ingredient's name up in the density table.
export function convertIngredientUnit(ingredient: Ingredient, toUnit: string, gramsPerMilliliter?: number): Ingredient {
  const density = gramsPerMilliliter ?? densityOf(ingredient.name);
  return {
    ...ingredient,
    quantity: convertQuantity(ingredient.quantity, ingredient.unit, toUnit, density),
    unit: toUnit,
  };
}
