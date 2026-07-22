import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

// SR Legacy uses legacy nutrient "number" strings (e.g. "203"), not the numeric IDs used by Foundation/Search
const LEGACY_NUMBER_TO_DB: Record<string, number> = {
  '203': 11, // Protein
  '291': 19, // Fiber
  '301': 10, // Calcium
  '303': 9,  // Iron
  '304': 12, // Magnesium
  '306': 16, // Potassium
  '309': 17, // Zinc
  '317': 18, // Selenium
  '320': 5,  // Vitamin A (RAE)
  '323': 7,  // Vitamin E
  '328': 6,  // Vitamin D
  '401': 4,  // Vitamin C
  '404': 1,  // Thiamine (B1)
  '405': 2,  // Riboflavin (B2)
  '406': 14, // Niacin (B3)
  '415': 3,  // Vitamin B6
  '417': 15, // Folate
  '418': 13, // Vitamin B12
  '430': 8,  // Vitamin K
}

// NDB number prefix (first 1–2 digits of the 4–5 digit ndbNumber) → food group
// e.g. "11148" → prefix 11 → Vegetables; "9427" → prefix 9 → Fruits
const NDB_PREFIX_TO_GROUP: Record<number, string> = {
  1:  'Dairy & Eggs',
  2:  'Spices & Herbs',
  4:  'Fats & Oils',
  5:  'Poultry',
  9:  'Fruits',
  10: 'Meat',
  11: 'Vegetables',
  12: 'Nuts & Seeds',
  13: 'Meat',
  15: 'Seafood',
  16: 'Legumes',
  17: 'Meat',
  20: 'Grains',
}

function ndbPrefix(ndbNumber: string): number {
  return Math.floor(parseInt(ndbNumber, 10) / 1000)
}

const PAGE_SIZE = 200

export async function POST(req: NextRequest) {
  if (!process.env.FDC_API_KEY) return NextResponse.json({ error: 'FDC_API_KEY not set' }, { status: 500 })
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })

  const { pageNumber = 1 } = await req.json()

  // List endpoint returns fdcId, ndbNumber, description, AND foodNutrients for SR Legacy
  const listUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/list')
  listUrl.searchParams.set('api_key', process.env.FDC_API_KEY)
  listUrl.searchParams.set('dataType', 'SR Legacy')
  listUrl.searchParams.set('pageSize', String(PAGE_SIZE))
  listUrl.searchParams.set('pageNumber', String(pageNumber))

  const listRes = await fetch(listUrl.toString())
  if (!listRes.ok) return NextResponse.json({ error: `FDC list error ${listRes.status}` }, { status: 502 })

  const listData = (await listRes.json()) as Record<string, unknown>[]
  const hasMore = listData.length === PAGE_SIZE

  // Filter to desired whole-food categories via NDB prefix
  const filtered = listData.filter(f => {
    const prefix = ndbPrefix(String(f.ndbNumber ?? ''))
    return prefix in NDB_PREFIX_TO_GROUP
  })

  if (filtered.length === 0) {
    return NextResponse.json({ pageNumber, foodsChecked: listData.length, foodsLoaded: 0, nutrientsLoaded: 0, errors: [], hasMore })
  }

  // Batch-upsert foods
  const foodRows = filtered.map(f => ({
    fdc_id:     f.fdcId as number,
    name:       f.description as string,
    food_group: NDB_PREFIX_TO_GROUP[ndbPrefix(String(f.ndbNumber))],
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

  // Build food_nutrients rows from the nutrients already in the list response
  type NutrientRow = { food_id: number; nutrient_id: number; amount_per_100g: number; state: string; source: string }
  const nutrientRows: NutrientRow[] = []

  for (const food of filtered) {
    const foodId = foodIdMap.get(food.fdcId as number)
    if (!foodId) { errors.push(`No DB id for FDC ${food.fdcId}`); continue }

    const fns = (food.foodNutrients as Record<string, unknown>[]) ?? []
    for (const fn of fns) {
      const dbNutrientId = LEGACY_NUMBER_TO_DB[fn.number as string]
      if (!dbNutrientId) continue
      const amount = fn.amount as number
      if (amount == null || amount === 0) continue

      nutrientRows.push({
        food_id:        foodId,
        nutrient_id:    dbNutrientId,
        amount_per_100g: amount,
        state:          'raw',
        source:         'FDC SR Legacy',
      })
    }
  }

  // Batch-upsert food_nutrients
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
    foodsLoaded:  upsertedFoods?.length ?? 0,
    nutrientsLoaded,
    errors,
    hasMore,
  })
}
