import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

const FDC_TO_DB_NUTRIENT: Record<number, number> = {
  1003: 11, 1079: 19, 1087: 10, 1089: 9,  1090: 12, 1092: 16,
  1095: 17, 1103: 18, 1106: 5,  1109: 7,  1114: 6,  1162: 4,
  1165: 1,  1166: 2,  1167: 14, 1175: 3,  1177: 15, 1178: 13, 1185: 8,
}

const FDC_NUTRIENT_IDS = Object.keys(FDC_TO_DB_NUTRIENT).map(Number)

// SR Legacy food category descriptions → our food_group labels
const CATEGORY_TO_GROUP: Record<string, string> = {
  'Vegetables and Vegetable Products': 'Vegetables',
  'Fruits and Fruit Juices':           'Fruits',
  'Legumes and Legume Products':       'Legumes',
  'Finfish and Shellfish Products':    'Seafood',
  'Poultry Products':                  'Poultry',
  'Beef Products':                     'Meat',
  'Pork Products':                     'Meat',
  'Lamb, Veal, and Game Products':     'Meat',
  'Dairy and Egg Products':            'Dairy & Eggs',
  'Cereal Grains and Pasta':           'Grains',
  'Nut and Seed Products':             'Nuts & Seeds',
  'Fats and Oils':                     'Fats & Oils',
  'Spices and Herbs':                  'Spices & Herbs',
}

const PAGE_SIZE = 200

function getCategoryString(food: Record<string, unknown>): string {
  const cat = food.foodCategory
  if (typeof cat === 'string') return cat
  if (cat && typeof cat === 'object') return (cat as { description?: string }).description ?? ''
  return ''
}

export async function POST(req: NextRequest) {
  if (!process.env.FDC_API_KEY) return NextResponse.json({ error: 'FDC_API_KEY not set' }, { status: 500 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

  const { pageNumber = 1 } = await req.json()

  // 1. Fetch one page of SR Legacy food summaries (no nutrients, just ids + categories)
  const listUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/list')
  listUrl.searchParams.set('api_key', process.env.FDC_API_KEY)
  listUrl.searchParams.set('dataType', 'SR Legacy')
  listUrl.searchParams.set('pageSize', String(PAGE_SIZE))
  listUrl.searchParams.set('pageNumber', String(pageNumber))

  const listRes = await fetch(listUrl.toString())
  if (!listRes.ok) return NextResponse.json({ error: `FDC list error ${listRes.status}` }, { status: 502 })

  const listData = (await listRes.json()) as Record<string, unknown>[]
  const hasMore = listData.length === PAGE_SIZE

  // 2. Filter to desired whole-food categories
  const filtered = listData.filter(f => getCategoryString(f) in CATEGORY_TO_GROUP)

  if (filtered.length === 0) {
    return NextResponse.json({ pageNumber, foodsChecked: listData.length, foodsLoaded: 0, nutrientsLoaded: 0, errors: [], hasMore })
  }

  // 3. Batch-fetch full nutrient data (20 at a time — FDC batch endpoint limit)
  const fdcIds = filtered.map(f => f.fdcId as number)
  const enriched: Record<string, unknown>[] = []

  for (let i = 0; i < fdcIds.length; i += 20) {
    const batch = fdcIds.slice(i, i + 20)
    const batchRes = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods?api_key=${process.env.FDC_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdcIds: batch, format: 'abridged', nutrients: FDC_NUTRIENT_IDS }),
      }
    )
    if (batchRes.ok) {
      const batchData = await batchRes.json()
      enriched.push(...(Array.isArray(batchData) ? batchData : []))
    }
  }

  // Build fdcId → food_group from the filtered list (enriched response may lack category)
  const groupMap = new Map<number, string>()
  for (const f of filtered) {
    const group = CATEGORY_TO_GROUP[getCategoryString(f)]
    if (group) groupMap.set(f.fdcId as number, group)
  }

  // 4. Batch-upsert foods
  const foodRows = enriched.map(f => ({
    fdc_id:     f.fdcId as number,
    name:       f.description as string,
    food_group: groupMap.get(f.fdcId as number) ?? 'Other',
  }))

  const { data: upsertedFoods, error: foodErr } = await supabase
    .from('foods')
    .upsert(foodRows, { onConflict: 'fdc_id' })
    .select('id, fdc_id')

  const errors: string[] = []
  if (foodErr) return NextResponse.json({ error: `Food upsert: ${foodErr.message}` }, { status: 500 })

  const foodIdMap = new Map<number, number>()
  for (const row of (upsertedFoods ?? []) as { id: number; fdc_id: number }[]) {
    foodIdMap.set(row.fdc_id, row.id)
  }

  // 5. Build food_nutrients rows
  type NutrientRow = { food_id: number; nutrient_id: number; amount_per_100g: number; state: string; source: string }
  const nutrientRows: NutrientRow[] = []

  for (const food of enriched) {
    const foodId = foodIdMap.get(food.fdcId as number)
    if (!foodId) { errors.push(`No DB id for FDC ${food.fdcId}`); continue }

    const fns = (food.foodNutrients as Record<string, unknown>[]) ?? []
    for (const fn of fns) {
      // abridged format → nutrientId/value; full format → nutrient.id/amount
      const fdcNutrientId = (fn.nutrientId ?? (fn.nutrient as Record<string, unknown>)?.id) as number | undefined
      const value = (fn.value ?? fn.amount) as number | undefined
      if (!fdcNutrientId || value == null) continue

      const dbNutrientId = FDC_TO_DB_NUTRIENT[fdcNutrientId]
      if (!dbNutrientId) continue

      nutrientRows.push({ food_id: foodId, nutrient_id: dbNutrientId, amount_per_100g: value, state: 'raw', source: 'FDC SR Legacy' })
    }
  }

  // 6. Batch-upsert food_nutrients
  let nutrientsLoaded = 0
  if (nutrientRows.length > 0) {
    const { error: nutErr } = await supabase
      .from('food_nutrients')
      .upsert(nutrientRows, { onConflict: 'food_id,nutrient_id,state' })
    if (nutErr) errors.push(`Nutrient upsert: ${nutErr.message}`)
    else nutrientsLoaded = nutrientRows.length
  }

  return NextResponse.json({
    pageNumber,
    foodsChecked: listData.length,
    foodsLoaded: upsertedFoods?.length ?? 0,
    nutrientsLoaded,
    errors,
    hasMore,
  })
}
