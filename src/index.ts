import {
  roundToKitchenFraction,
  roundToWholeUnit,
  formatMixedNumber,
  isPluralQuantity,
  pluralizeUnit,
} from "./fraction.js";

export { roundToKitchenFraction, parseQuantity } from "./fraction.js";
export type { MixedNumber } from "./fraction.js";

// Most ingredients scale in direct proportion to servings. A few don't:
// - "sqrt" is for salt, spice heat, and leavening, where doubling a recipe
//   doubling the seasoning would overpower it. Growth trails off with scale.
// - "fixed" is for things that don't meaningfully change with batch size,
//   like a single vanilla bean or a pan liner.
export type ScalingBehavior = "linear" | "sqrt" | "fixed";

// How a scaled quantity gets rounded for display. "fraction" (the default)
// snaps to a kitchen measuring fraction. "whole" rounds to the nearest whole
// number instead, for ingredients that only come in whole units - you can't
// crack half an egg or slice a fraction of a vanilla bean.
export type RoundingMode = "fraction" | "whole";

export interface Ingredient {
  // Descriptive text appended after the amount, e.g. "flour". Leave empty
  // when the unit itself is the noun, e.g. { unit: "egg", name: "" }.
  name: string;
  // Zero means "to taste" or otherwise not scaled by amount.
  quantity: number;
  unit: string;
  scaling?: ScalingBehavior;
  rounding?: RoundingMode;
}

export interface Recipe {
  name: string;
  servings: number;
  ingredients: Ingredient[];
}

export function scaleQuantity(quantity: number, factor: number, behavior: ScalingBehavior): number {
  if (quantity === 0) {
    // "salt, to taste" stays "to taste" no matter how the batch grows.
    return 0;
  }
  switch (behavior) {
    case "fixed":
      return quantity;
    case "sqrt":
      return quantity * Math.sqrt(factor);
    case "linear":
    default:
      return quantity * factor;
  }
}

export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  if (targetServings <= 0) {
    throw new RangeError("targetServings must be greater than zero");
  }
  if (recipe.servings <= 0) {
    throw new RangeError("recipe.servings must be greater than zero");
  }

  const factor = targetServings / recipe.servings;

  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: scaleQuantity(ingredient.quantity, factor, ingredient.scaling ?? "linear"),
    })),
  };
}

export function formatQuantity(quantity: number, unit: string, rounding: RoundingMode = "fraction"): string {
  if (rounding === "whole") {
    const whole = roundToWholeUnit(quantity);
    const unitPart = pluralizeUnit(unit, whole !== 1);
    return unitPart ? `${whole} ${unitPart}` : String(whole);
  }
  const mixed = roundToKitchenFraction(quantity);
  const numberPart = formatMixedNumber(mixed);
  const unitPart = pluralizeUnit(unit, isPluralQuantity(mixed));
  return unitPart ? `${numberPart} ${unitPart}` : numberPart;
}

export function formatIngredient(ingredient: Ingredient): string {
  if (ingredient.quantity === 0) {
    return `${ingredient.name || ingredient.unit} (to taste)`;
  }
  const amount = formatQuantity(ingredient.quantity, ingredient.unit, ingredient.rounding ?? "fraction");
  return ingredient.name ? `${amount} ${ingredient.name}` : amount;
}
