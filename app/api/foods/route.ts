import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isUnsafeRaw } from '@/lib/food-state'

function bestPrepMethod(solubility: string | null, stableHeat: boolean, stableLight: boolean): string {
  if (solubility === 'fat') return 'Cook with a small amount of healthy fat (e.g. olive oil) to maximise absorption'
  if (!stableHeat) return 'Use minimal heat — steam, microwave, or eat raw; avoid boiling'
  if (!stableLight) return 'Store away from light; cooking method is less critical than light exposure'
  return 'Steam or stir-fry to minimise leaching into cooking water; if boiling, use the liquid'
}

// Above this many tied methods, the individual names stop being useful —
// e.g. Iron in Meat ties 46 of 66 USDA methods at 100% retention, meaning
// virtually no method loses any iron. In that case the specific method
// names carry no signal; what matters is that retention barely varies.
const MAX_METHODS_TO_LIST = 4

function describeRetention(prepMethods: string[], retentionPct: number): string {
  if (prepMethods.length > MAX_METHODS_TO_LIST) {
    return `${retentionPct}% retained regardless of cooking method`
  }
  // " / " rather than "," — individual method names already contain commas
  // (e.g. "Baked, With drippings"), so a comma-joined list of ties reads ambiguously.
  return `${prepMethods.join(' / ')} (${retentionPct}% retention)`
}

function suggestedGrams(amountPer100g: number | null, driValue: number | null): number {
  if (!amountPer100g || !driValue) return 100
  // Aim for ~25% of RDI from this food, capped between 50–300 g
  const grams = Math.round((driValue * 0.25 / amountPer100g) * 100)
  return Math.min(300, Math.max(50, grams))
}

export async function GET(req: NextRequest) {
  const nutrientId = Number(req.nextUrl.searchParams.get('nutrientId'))
  const sex = req.nextUrl.searchParams.get('sex') ?? 'female'
  if (!nutrientId) return NextResponse.json({ error: 'nutrientId required' }, { status: 400 })

  // Get nutrient info
  const { data: nutrient } = await supabase
    .from('nutrients')
    .select('*')
    .eq('id', nutrientId)
    .single()

  // Get DRI value
  const { data: dri } = await supabase
    .from('dri_values')
    .select('*')
    .eq('nutrient_id', nutrientId)
    .in('sex', [sex, 'all'])
    .eq('age_group', '19-50')
    .order('sex', { ascending: true })
    .limit(1)
    .single()

  // Get foods highest in this nutrient, across whatever state each food
  // actually is (raw and cooked entries are separate foods, not two values
  // of the same food — there's no single row that has both).
  const { data: allRows, error } = await supabase
    .from('food_nutrients')
    .select('*, food:foods(*)')
    .eq('nutrient_id', nutrientId)
    .order('amount_per_100g', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (allRows ?? []).filter((r: Record<string, unknown>) => {
    const food = r.food as Record<string, unknown>
    // Per-100g nutrient density for spices is meaningless as a recommendation —
    // nobody eats 100g of a spice, so it always looks absurdly nutrient-dense.
    // Keep spices for the direct food-lookup path though, where the user
    // explicitly asked about that specific food rather than being shown a ranked list.
    if (food.food_group === 'Spices & Herbs') return false
    return !isUnsafeRaw(food.name as string, food.food_group as string | null)
  }).slice(0, 30)

  // Retention factors for this nutrient, scoped per food group — best (highest) method per group.
  const { data: retentionRows } = await supabase
    .from('retention_factors')
    .select('*')
    .eq('nutrient_id', nutrientId)

  // Group by food_group, keeping every method tied for the highest retention_pct —
  // USDA's data frequently ties several prep methods at the same retention, and
  // picking just one of them would present an arbitrary choice as "the best".
  const bestRetentionByGroup = new Map<string, { prep_methods: string[]; retention_pct: number }>()
  for (const rf of (retentionRows ?? []) as { food_group: string; prep_method: string; retention_pct: number }[]) {
    const existing = bestRetentionByGroup.get(rf.food_group)
    if (!existing || rf.retention_pct > existing.retention_pct) {
      bestRetentionByGroup.set(rf.food_group, { prep_methods: [rf.prep_method], retention_pct: rf.retention_pct })
    } else if (rf.retention_pct === existing.retention_pct) {
      existing.prep_methods.push(rf.prep_method)
    }
  }

  // Get absorption rules
  const { data: absorptionRules } = await supabase
    .from('absorption_rules')
    .select('*')
    .eq('nutrient_id', nutrientId)

  const genericPrep = bestPrepMethod(nutrient?.solubility, nutrient?.stable_heat, nutrient?.stable_light)

  const foods = rows.map((r: Record<string, unknown>) => {
    const food = r.food as Record<string, unknown>
    const amount = r.amount_per_100g as number
    const state = r.state as 'raw' | 'cooked'
    const retention = food.food_group ? bestRetentionByGroup.get(food.food_group as string) : undefined

    const estimatedCooked = state === 'raw' && retention
      ? Math.round(amount * ((retention.retention_pct as number) / 100) * 10) / 10
      : null

    const prepMethod = retention
      ? describeRetention(retention.prep_methods, retention.retention_pct)
      : genericPrep

    return {
      food,
      amount,
      state,
      estimated_cooked: estimatedCooked,
      pct_rdi: dri ? Math.round((amount / dri.rda_or_ai) * 100) : null,
      best_prep_method: prepMethod,
      absorption_enhancers: (absorptionRules ?? [])
        .filter((rule: Record<string, unknown>) => rule.rule_type === 'enhancer')
        .map((rule: Record<string, unknown>) => ({ compound: rule.compound, effect: rule.effect, source_url: rule.source_url })),
      absorption_inhibitors: (absorptionRules ?? [])
        .filter((rule: Record<string, unknown>) => rule.rule_type === 'inhibitor')
        .map((rule: Record<string, unknown>) => ({ compound: rule.compound, effect: rule.effect, source_url: rule.source_url })),
      suggested_grams: suggestedGrams(amount, dri?.rda_or_ai ?? null),
    }
  })

  return NextResponse.json({ nutrient, dri, foods })
}
