# Changelog

All notable changes to this project are documented in this file.

## [0.1.0]

Initial release.

### Added

- `scaleRecipe` and `scaleQuantity`, with `"linear"`, `"sqrt"`, and `"fixed"`
  scaling behaviors, and `quantity: 0` ("to taste") left unscaled.
- `formatQuantity` and `formatIngredient`, rounding to a kitchen-friendly
  fraction (halves, thirds, quarters, eighths) by default, with correct
  singular/plural unit handling.
- `"whole"` rounding mode for ingredients that only come in whole units,
  like eggs or slices of bread.
- `parseQuantity`, reading whole numbers, decimals, simple and mixed
  fractions, and unicode vulgar fractions (`"1½"`).
- Irregular plural exceptions (`leaf` -> `leaves`, `potato` -> `potatoes`,
  etc.) for units the regular suffix rules get wrong.
- `convertQuantity` and `convertIngredientUnit` for converting between
  units of the same kind (volume-to-volume or weight-to-weight). Crossing
  volume and weight throws, since that needs an ingredient's density,
  which this library doesn't have data for.
- `unitCategory` for looking up whether a unit is volume or weight.
