// Grams per milliliter for ingredients common enough in home cooking to be
// worth a default. These are averages taken from the cup-to-gram figures
// recipe sites converge on (e.g. "1 cup all-purpose flour = 125 g"), not lab
// measurements - actual density varies with how packed an ingredient is,
// brand, and temperature. Good enough to turn "2 cups flour" into a gram
// figure a kitchen scale can use; not good enough to bill someone by the gram.
const INGREDIENT_DENSITIES: Readonly<Record<string, number>> = {
  water: 1,
  milk: 1.03,
  "all-purpose flour": 0.53,
  "bread flour": 0.54,
  "granulated sugar": 0.85,
  "brown sugar": 0.93,
  "powdered sugar": 0.56,
  butter: 0.96,
  "vegetable oil": 0.92,
  "olive oil": 0.92,
  honey: 1.42,
  "maple syrup": 1.32,
  "rolled oats": 0.34,
  "table salt": 1.22,
  "kosher salt": 0.96,
  "cocoa powder": 0.51,
  rice: 0.78,
  cornmeal: 0.58,
  "coconut oil": 0.92,
  "peanut butter": 1.1,
  "sour cream": 1.01,
  yogurt: 1.04,
  buttermilk: 1.04,
  "heavy cream": 0.98,
  "cream cheese": 0.96,
};

// Looked up by an ingredient's name, case-insensitively and trimmed, since
// that's the form Ingredient.name is written in.
export function densityOf(name: string): number | undefined {
  return INGREDIENT_DENSITIES[name.trim().toLowerCase()];
}
