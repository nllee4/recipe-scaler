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

This library handles the scaling math, fraction rounding, reading a
quantity out of the fraction strings recipes are usually written with, and
converting between units of the same kind. It leaves everything else
(parsing a full recipe from text, converting volume to weight, UI) out of
scope.

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

## Parsing quantities

Recipes are usually typed as fractions, not decimals. `parseQuantity`
reads the formats a person actually writes:

```ts
import { parseQuantity } from "recipe-scaler";

parseQuantity("2");      // 2
parseQuantity("3/4");    // 0.75
parseQuantity("1 1/2");  // 1.5
parseQuantity("1½");     // 1.5
```

It throws on a zero denominator, a negative quantity, or text it can't
parse at all.

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

## Rounding modes

Scaling can turn a whole ingredient into an awkward quantity - two eggs
scaled from 4 servings to 7 comes out to 3.5 eggs. Set `rounding` on an
ingredient to control how the final quantity is displayed:

- `"fraction"` (default): rounds to the nearest kitchen fraction (halves,
  thirds, quarters, eighths). Use this for anything you measure by volume
  or weight.
- `"whole"`: rounds to the nearest whole number. Use this for ingredients
  that only come in whole units, like eggs or slices of bread.

```ts
const eggs = { name: "", quantity: 2, unit: "egg", rounding: "whole" as const };
formatIngredient({ ...eggs, quantity: 3.5 }); // "4 eggs", not "3 1/2 eggs"
```

## Unit conversion

`convertQuantity` converts between units of the same kind - volume to
volume, or weight to weight:

```ts
import { convertQuantity } from "recipe-scaler";

convertQuantity(1, "cup", "ml");   // 236.5882365
convertQuantity(3, "tsp", "tbsp"); // 1
convertQuantity(1, "lb", "oz");    // 16
```

Supported volume units: `ml`, `l`, `tsp`, `tbsp`, `fl oz`, `cup`, `pt`,
`qt`, `gal`. Supported weight units: `g`, `kg`, `oz`, `lb`. `fl oz` and
`oz` are kept separate since a fluid ounce and a weight ounce aren't the
same unit.

Converting volume to weight (or back) needs an ingredient's density, which
this library doesn't have data for, so `convertQuantity` throws rather
than guessing:

```ts
convertQuantity(1, "cup", "g"); // throws
```

`convertIngredientUnit(ingredient, toUnit)` applies the same conversion to
a whole ingredient, returning a new ingredient with the quantity converted
and the unit swapped.

## Development

There's no build step required to read the source; `src/index.ts` and
`src/fraction.ts` are the whole library. To build and run the tests:

```
npm run build
npm test
```

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT, see [LICENSE](./LICENSE).
