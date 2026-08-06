import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deriveFoodState } from '@/lib/food-state'

function bestPrepMethod(solubility: string | null, stableHeat: boolean, stableLight: boolean): string {
  if (solubility === 'fat') return 'Cook with a small amount of healthy fat (e.g. olive oil) to maximise absorption'
  if (!stableHeat) return 'Use minimal heat — steam, microwave, or eat raw; avoid boiling'
  if (!stableLight) return 'Store away from light; cooking method is less critical than light exposure'
  return 'Steam or stir-fry to minimise leaching into cooking water; if boiling, use the liquid'
}

// Food groups that aren't whole foods — extracted/isolated products sold as
// supplements rather than something you'd cook or eat directly.
const EXCLUDED_GROUPS = ['Supplements']

// Land-animal meat groups are practically never eaten raw — hide raw-state
// entries for these so users aren't offered "Chicken, raw" as a lookup result.
const RAW_EXCLUDED_GROUPS = new Set(['Meat', 'Poultry'])

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  const foodId = req.nextUrl.searchParams.get('foodId')
  const sex = req.nextUrl.searchParams.get('sex') ?? 'female'

  if (!name && !foodId) return NextResponse.json({ error: 'name or foodId required' }, { status: 400 })

  let food: { id: number; name: string; food_group: string | null } | null = null

  if (foodId) {
    const { data } = await supabase.from('foods').select('id, name, food_group').eq('id', Number(foodId)).single()
    food = data
  } else {
    // Search food by name — match all words case-insensitively
    const words = (name as string).split(/\s+/).filter(Boolean)
    let query = supabase.from('foods').select('id, name, food_group').not('food_group', 'in', `(${EXCLUDED_GROUPS.join(',')})`)
    for (const word of words) {
      query = query.ilike('name', `%${word}%`)
    }
    const { data: rawMatches } = await query.order('name').limit(50)

    const matches = (rawMatches ?? []).filter((m: { name: string; food_group: string | null }) =>
      !(m.food_group && RAW_EXCLUDED_GROUPS.has(m.food_group) && deriveFoodState(m.name, m.food_group) === 'raw')
    )

    if (matches.length === 0) {
      return NextResponse.json({ food: null, matches: [], nutrients: [] })
    }

    // More than one candidate — let the user pick rather than guessing.
    if (matches.length > 1) {
      return NextResponse.json({ food: null, matches, nutrients: [] })
    }

    food = matches[0] as { id: number; name: string; food_group: string | null }
  }

  if (!food) return NextResponse.json({ food: null, matches: [], nutrients: [] })

  // Get all nutrient amounts for this food — we need every value present so
  // we can rank by %RDI, not just whichever happen to have the largest amount.
  // Each food entry already represents one specific prep state (raw or
  // cooked, per its own FDC record), so no state filter is needed here.
  const { data: allFnRows, error } = await supabase
    .from('food_nutrients')
    .select('nutrient_id, amount_per_100g')
    .eq('food_id', food.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!allFnRows || allFnRows.length === 0) return NextResponse.json({ food, nutrients: [] })

  const nutrientIds = allFnRows.map((r: { nutrient_id: number }) => r.nutrient_id)

  // Fetch nutrient details, DRI values, and absorption rules in parallel
  const [{ data: nutrientRows }, { data: driRows }, { data: absorptionRows }] = await Promise.all([
    supabase
      .from('nutrients')
      .select('id, name, solubility, vitamer_form, stable_heat, stable_light')
      .in('id', nutrientIds),
    supabase
      .from('dri_values')
      .select('nutrient_id, rda_or_ai, unit')
      .in('nutrient_id', nutrientIds)
      .in('sex', [sex, 'all'])
      .eq('age_group', '19-50'),
    supabase
      .from('absorption_rules')
      .select('nutrient_id, rule_type, compound, effect')
      .in('nutrient_id', nutrientIds),
  ])

  // Build lookup maps
  type NutrientRow = { id: number; name: string; solubility: string | null; vitamer_form: string | null; stable_heat: boolean; stable_light: boolean }
  type DriRow = { nutrient_id: number; rda_or_ai: number; unit: string }
  type AbsorptionRow = { nutrient_id: number; rule_type: string; compound: string; effect: string }

  const nutrientMap = new Map<number, NutrientRow>()
  for (const n of (nutrientRows ?? []) as NutrientRow[]) nutrientMap.set(n.id, n)

  const driMap = new Map<number, DriRow>()
  for (const d of (driRows ?? []) as DriRow[]) {
    // prefer sex-specific over 'all'; since we ordered by sex asc and 'all' < 'female'/'male', last write wins for sex-specific
    driMap.set(d.nutrient_id, d)
  }

  const enhancerMap = new Map<number, { compound: string; effect: string }[]>()
  const inhibitorMap = new Map<number, { compound: string; effect: string }[]>()
  for (const rule of (absorptionRows ?? []) as AbsorptionRow[]) {
    if (rule.rule_type === 'enhancer') {
      if (!enhancerMap.has(rule.nutrient_id)) enhancerMap.set(rule.nutrient_id, [])
      enhancerMap.get(rule.nutrient_id)!.push({ compound: rule.compound, effect: rule.effect })
    } else {
      if (!inhibitorMap.has(rule.nutrient_id)) inhibitorMap.set(rule.nutrient_id, [])
      inhibitorMap.get(rule.nutrient_id)!.push({ compound: rule.compound, effect: rule.effect })
    }
  }

  type FnRow = { nutrient_id: number; amount_per_100g: number }
  const nutrients = (allFnRows as FnRow[])
    .map(row => {
      const nutrient = nutrientMap.get(row.nutrient_id)
      const dri = driMap.get(row.nutrient_id)
      return {
        nutrient: nutrient
          ? { id: nutrient.id, name: nutrient.name, solubility: nutrient.solubility, vitamer_form: nutrient.vitamer_form }
          : { id: row.nutrient_id, name: `Nutrient #${row.nutrient_id}`, solubility: null, vitamer_form: null },
        amount_per_100g: row.amount_per_100g,
        unit: dri?.unit ?? '',
        pct_rdi: dri ? Math.round((row.amount_per_100g / dri.rda_or_ai) * 100) : null,
        best_prep_method: nutrient
          ? bestPrepMethod(nutrient.solubility, nutrient.stable_heat, nutrient.stable_light)
          : '—',
        enhancers: enhancerMap.get(row.nutrient_id) ?? [],
        inhibitors: inhibitorMap.get(row.nutrient_id) ?? [],
      }
    })
    // Rank by %RDI — nutrients without a DRI value (no pct_rdi) sort last.
    .sort((a, b) => (b.pct_rdi ?? -1) - (a.pct_rdi ?? -1))
    .slice(0, 10)

  return NextResponse.json({ food, nutrients })
}
