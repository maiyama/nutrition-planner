import type { SupabaseClient } from '@supabase/supabase-js'

// USDA food names are usually plural ("Blueberries, raw") while users often
// search the singular ("blueberry"), and vice versa — plain substring
// matching misses these since "blueberries" doesn't contain "blueberry".
// Generate plausible singular/plural forms so either spelling matches.
export function wordVariants(word: string): string[] {
  const w = word.toLowerCase()
  const variants = new Set<string>([w])

  if (/[^aeiou]y$/.test(w)) variants.add(w.slice(0, -1) + 'ies') // berry → berries
  else variants.add(w + 's')                                     // apple → apples
  variants.add(w + 'es')                                         // tomato → tomatoes

  if (w.endsWith('ies')) variants.add(w.slice(0, -3) + 'y')       // berries → berry
  if (w.endsWith('es')) variants.add(w.slice(0, -2))              // tomatoes → tomato
  if (w.endsWith('s') && !w.endsWith('ss')) variants.add(w.slice(0, -1)) // onions → onion

  return [...variants]
}

export type FoodMatch = { id: number; name: string; food_group: string | null }

// Search `foods` by name — every word must match (as any singular/plural
// variant) somewhere in the name, independent of word order, so a query like
// "goat cheese" matches USDA's inverted "Cheese, goat, soft type".
export async function searchFoodsByName(
  client: SupabaseClient,
  name: string,
  opts: { excludeGroups?: string[] } = {}
): Promise<{ matches: FoodMatch[] } | { error: string }> {
  const words = name.split(/\s+/).filter(Boolean)
  let query = client.from('foods').select('id, name, food_group')
  if (opts.excludeGroups?.length) {
    query = query.not('food_group', 'in', `(${opts.excludeGroups.join(',')})`)
  }
  for (const word of words) {
    const sanitized = word.replace(/[,()]/g, '')
    const orFilter = wordVariants(sanitized).map(v => `name.ilike.%${v}%`).join(',')
    query = query.or(orFilter)
  }

  const { data, error } = await query.order('name').limit(50)
  if (error) return { error: error.message }
  return { matches: (data ?? []) as FoodMatch[] }
}
