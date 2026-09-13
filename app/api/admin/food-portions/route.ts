import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('food_portions')
    .select('*, food:foods(id, name, food_group)')
    .order('food_id')
    .order('modifier')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// Applies one {modifier, grams, note} entry to every selected food at once —
// the admin picks several matches for one search (e.g. "beets" → raw + all
// cooked/canned variants) and enters the weight a single time.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { food_ids, modifier, grams, note } = body as {
    food_ids: number[]; modifier: string; grams: number; note?: string
  }

  if (!Array.isArray(food_ids) || food_ids.length === 0) {
    return NextResponse.json({ error: 'food_ids required' }, { status: 400 })
  }
  if (!['small', 'medium', 'large'].includes(modifier)) {
    return NextResponse.json({ error: 'modifier must be small, medium, or large' }, { status: 400 })
  }
  if (!grams || grams <= 0) {
    return NextResponse.json({ error: 'grams must be a positive number' }, { status: 400 })
  }

  const rows = food_ids.map(food_id => ({ food_id, modifier, grams, note: note || null }))

  const { data, error } = await supabaseAdmin
    .from('food_portions')
    .insert(rows)
    .select('*, food:foods(id, name, food_group)')

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'One of the selected foods already has a portion for this size — edit or delete the existing entry instead.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabaseAdmin.from('admin_change_log').insert(
    data.map(row => ({
      table_name: 'food_portions',
      row_id: row.id,
      field_changed: 'new_row',
      new_value: JSON.stringify({ food_id: row.food_id, modifier: row.modifier, grams: row.grams }),
      note: 'Created via admin UI',
    }))
  )

  return NextResponse.json(data)
}
