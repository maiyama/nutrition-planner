export type FoodState = 'raw' | 'cooked'

const RAW_KEYWORDS = /\b(raw|uncooked|unprepared)\b/i
const COOKED_KEYWORDS = /\b(cooked|roasted|boiled|baked|grilled|broiled|smoked|steamed|fried|braised|stewed|poached|simmered|rotisserie|canned|cured|rendered|dry heat|moist heat)\b/i

// Land-animal meat groups are almost never eaten raw — deli/cured/processed
// entries that don't say "raw" (e.g. "Bologna, beef", "Ham, sliced") are
// ready-to-eat, so default them to cooked rather than the general fallback.
const DEFAULT_COOKED_GROUPS = new Set(['Meat', 'Poultry'])

export function deriveFoodState(description: string, foodGroup?: string | null): FoodState {
  if (RAW_KEYWORDS.test(description)) return 'raw'
  if (COOKED_KEYWORDS.test(description)) return 'cooked'
  return foodGroup && DEFAULT_COOKED_GROUPS.has(foodGroup) ? 'cooked' : 'raw'
}

// Whole food groups where raw consumption is unsafe or not practically how
// the food is eaten. Meat/Poultry: near-universally cooked. Legumes: many
// raw beans (kidney beans especially) contain phytohaemagglutinin, a toxin
// destroyed by cooking — raw is not just unusual, it's dangerous.
const RAW_EXCLUDED_GROUPS = new Set(['Meat', 'Poultry', 'Legumes'])

// Individual foods that are unsafe/impractical raw even within an otherwise
// raw-friendly group (e.g. most Grains are fine raw, rice specifically isn't —
// raw rice is hard to digest and carries a higher risk of contamination).
// Extend this list as more cases come up.
const RAW_EXCLUDED_NAME_PATTERNS: RegExp[] = [
  /\brice\b/i,
]

// True if this food, in its actual (derived) state, shouldn't be surfaced as
// a raw-eating suggestion — either because its whole food group is unsafe/
// impractical raw, or because this specific food is.
export function isUnsafeRaw(name: string, foodGroup?: string | null): boolean {
  if (deriveFoodState(name, foodGroup) !== 'raw') return false
  if (foodGroup && RAW_EXCLUDED_GROUPS.has(foodGroup)) return true
  return RAW_EXCLUDED_NAME_PATTERNS.some(p => p.test(name))
}
