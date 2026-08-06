import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { isUnsafeRaw } from '@/lib/food-state'

function bestPrepMethod(solubility: string | null, stableHeat: boolean, stableLight: boolean): string {
  if (solubility === 'fat') return 'Cook with a small amount of healthy fat (e.g. olive oil) to maximise absorption'
  if (!stableHeat) return 'Use minimal heat — steam, microwave, or eat raw; avoid boiling'
  if (!stableLight) return 'Store away from light; cooking method is less critical than light exposure'
  return 'Steam or stir-fry to minimise leaching into cooking water; if boiling, use the liquid'
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
    return !isUnsafeRaw(food.name as string, food.food_group as string | null)
  }).slice(0, 30)

  // Retention factors for this nutrient, scoped per food group — best (highest) method per group.
  const { data: retentionRows } = await supabase
    .from('retention_factors')
    .select('*')
    .eq('nutrient_id', nutrientId)

  const bestRetentionByGroup = new Map<string, Record<string, unknown>>()
  for (const rf of (retentionRows ?? []) as Record<string, unknown>[]) {
    const group = rf.food_group as string
    const existing = bestRetentionByGroup.get(group)
    if (!existing || (rf.retention_pct as number) > (existing.retention_pct as number)) {
      bestRetentionByGroup.set(group, rf)
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
      ? `${retention.prep_method} (${retention.retention_pct}% retention)`
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
