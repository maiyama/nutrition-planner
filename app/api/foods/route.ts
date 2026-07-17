import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

  // Get foods with raw amounts for this nutrient, sorted by amount desc
  const { data: rawRows, error } = await supabase
    .from('food_nutrients')
    .select('*, food:foods(*)')
    .eq('nutrient_id', nutrientId)
    .eq('state', 'raw')
    .order('amount_per_100g', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Get cooked amounts for same foods
  const foodIds = (rawRows ?? []).map((r: Record<string, unknown>) => (r.food as Record<string, unknown>).id)
  const { data: cookedRows } = await supabase
    .from('food_nutrients')
    .select('food_id, amount_per_100g')
    .eq('nutrient_id', nutrientId)
    .eq('state', 'cooked')
    .in('food_id', foodIds)

  const cookedMap: Record<number, number> = {}
  for (const c of cookedRows ?? []) {
    cookedMap[(c as Record<string, unknown>).food_id as number] = (c as Record<string, unknown>).amount_per_100g as number
  }

  // Get retention factors for this nutrient
  const { data: retentionRows } = await supabase
    .from('retention_factors')
    .select('*')
    .eq('nutrient_id', nutrientId)

  // Best retention method: highest retention_pct
  const bestRetention = (retentionRows ?? []).sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) =>
      (b.retention_pct as number) - (a.retention_pct as number)
  )[0] as Record<string, unknown> | undefined

  // Get absorption rules
  const { data: absorptionRules } = await supabase
    .from('absorption_rules')
    .select('*')
    .eq('nutrient_id', nutrientId)

  const prep = bestPrepMethod(nutrient?.solubility, nutrient?.stable_heat, nutrient?.stable_light)
  const prepMethod = bestRetention
    ? `${bestRetention.prep_method} (${bestRetention.retention_pct}% retention)`
    : prep

  const foods = (rawRows ?? []).map((r: Record<string, unknown>) => {
    const food = r.food as Record<string, unknown>
    const raw = r.amount_per_100g as number
    const cooked = cookedMap[food.id as number] ?? null
    const cookedEstimated = cooked === null && bestRetention
    const estimatedCooked = cookedEstimated && bestRetention
      ? Math.round(raw * ((bestRetention.retention_pct as number) / 100) * 10) / 10
      : null

    return {
      food,
      amount_raw: raw,
      amount_cooked: cooked ?? estimatedCooked,
      cooked_is_estimated: !cooked && !!estimatedCooked,
      pct_rdi: dri ? Math.round((raw / dri.rda_or_ai) * 100) : null,
      best_prep_method: prepMethod,
      absorption_enhancers: (absorptionRules ?? [])
        .filter((rule: Record<string, unknown>) => rule.rule_type === 'enhancer')
        .map((rule: Record<string, unknown>) => ({ compound: rule.compound, effect: rule.effect, source_url: rule.source_url })),
      absorption_inhibitors: (absorptionRules ?? [])
        .filter((rule: Record<string, unknown>) => rule.rule_type === 'inhibitor')
        .map((rule: Record<string, unknown>) => ({ compound: rule.compound, effect: rule.effect, source_url: rule.source_url })),
      suggested_grams: suggestedGrams(raw, dri?.rda_or_ai ?? null),
    }
  })

  return NextResponse.json({ nutrient, dri, foods })
}
