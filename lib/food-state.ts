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
