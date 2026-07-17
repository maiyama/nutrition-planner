import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

// FDC nutrient number → our Supabase nutrient row ID
const FDC_TO_DB_NUTRIENT: Record<number, number> = {
  1003: 11, // Protein
  1087: 10, // Calcium
  1089: 9,  // Iron
  1090: 12, // Magnesium
  1106: 5,  // Vitamin A (RAE)
  1109: 7,  // Vitamin E
  1114: 6,  // Vitamin D
  1162: 4,  // Vitamin C
  1165: 1,  // Thiamine (B1)
  1166: 2,  // Riboflavin (B2)
  1175: 3,  // Vitamin B6
  1185: 8,  // Vitamin K
}

export async function POST(req: NextRequest) {
  const { query, foodGroup } = await req.json()

  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?api_key=${process.env.FDC_API_KEY}` +
    `&dataType=Foundation` +
    `&query=${encodeURIComponent(query)}` +
    `&pageSize=50`

  const fdcRes = await fetch(url)
  if (!fdcRes.ok) {
    return NextResponse.json({ error: 'FDC API error', status: fdcRes.status }, { status: 502 })
  }

  const data = await fdcRes.json()
  const foods: Record<string, unknown>[] = data.foods ?? []

  let foodsLoaded = 0
  let nutrientsLoaded = 0
  const errors: string[] = []

  for (const food of foods) {
    const { data: foodRow, error: foodErr } = await supabase
      .from('foods')
      .upsert(
        { fdc_id: food.fdcId, name: food.description, food_group: foodGroup },
        { onConflict: 'fdc_id' }
      )
      .select('id')
      .single()

    if (foodErr || !foodRow) {
      errors.push(`Food upsert failed: ${food.description} — ${foodErr?.message}`)
      continue
    }
    foodsLoaded++

    const foodNutrients = (food.foodNutrients as Record<string, unknown>[]) ?? []
    for (const fn of foodNutrients) {
      const dbNutrientId = FDC_TO_DB_NUTRIENT[fn.nutrientId as number]
      if (!dbNutrientId || !fn.value) continue

      const { error: nutErr } = await supabase.from('food_nutrients').upsert(
        {
          food_id: foodRow.id,
          nutrient_id: dbNutrientId,
          amount_per_100g: fn.value,
          state: 'raw',
          source: 'FDC Foundation',
        },
        { onConflict: 'food_id,nutrient_id,state' }
      )

      if (nutErr) {
        errors.push(`Nutrient upsert failed: food ${foodRow.id}, nutrient ${dbNutrientId} — ${nutErr.message}`)
      } else {
        nutrientsLoaded++
      }
    }
  }

  return NextResponse.json({ query, foodsLoaded, nutrientsLoaded, errors })
}
