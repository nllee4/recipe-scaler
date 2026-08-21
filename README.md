# recipe-scaler

A small TypeScript library for scaling a recipe's ingredient list to a
different number of servings.

Naively scaling a recipe means multiplying every quantity by the same
factor, but that falls apart in a few predictable ways:

- Salt, spice heat, and leavening don't scale linearly. Doubling a cookie
  recipe and doubling the baking soda will make it taste like baking soda.
  These need to grow slower than the rest of the ingredients as the batch
  gets bigger.
- Some ingredients don't scale at all. A single vanilla bean flavors a
  batch whether it serves four or eight.
- "Salt, to taste" has a quantity of zero, and zero times any factor is
  still zero. It should stay that way instead of vanishing or erroring.
- Multiplying decimals produces things like `0.6666666666666666 cups`
  when what you actually measure with is a set of measuring cups marked
  in halves, thirds, quarters, and eighths.
- Whether an amount reads as singular or plural isn't just "is it not
  exactly one" — `1/2 cup` and `1 1/2 cups` are both idiomatic even
  though neither is a "normal" plural/singular split by value.

This library handles the scaling math and the fraction rounding, and
leaves everything else (parsing recipes from text, unit conversion, UI)
out of scope.

## Usage

```ts
import { scaleRecipe, formatIngredient } from "recipe-scaler";

const pancakes = {
  name: "pancakes",
  servings: 4,
  ingredients: [
    { name: "flour", quantity: 2, unit: "cup" },
    { name: "salt", quantity: 1, unit: "tsp", scaling: "sqrt" },
    { name: "", quantity: 2, unit: "egg" },
    { name: "black pepper", quantity: 0, unit: "tsp" },
  ],
};

const forSix = scaleRecipe(pancakes, 6);

for (const ingredient of forSix.ingredients) {
  console.log(formatIngredient(ingredient));
}
// 3 cups flour
// 1 1/4 tsp salt
// 3 eggs
// black pepper (to taste)
```

## Ingredient scaling modes

Each ingredient can set `scaling` to one of:

- `"linear"` (default): quantity grows in direct proportion to servings.
- `"sqrt"`: quantity grows with the square root of the factor. Use this
  for salt, spice heat, and leavening, where intensity shouldn't scale
  as fast as volume.
- `"fixed"`: quantity never changes, regardless of the factor. Use this
  for things like a single vanilla bean or a pan liner.

An ingredient with `quantity: 0` (e.g. "salt, to taste") is left at zero
under every scaling mode.

## Development

There's no build step required to read the source; `src/index.ts` and
`src/fraction.ts` are the whole library. To build and run the tests:

```
npm run build
npm test
```

## License

MIT, see [LICENSE](./LICENSE).
