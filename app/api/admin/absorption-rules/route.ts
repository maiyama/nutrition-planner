import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('absorption_rules')
    .select('*, nutrient:nutrients(id, name)')
    .order('nutrient_id')
    .order('rule_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nutrient_id, rule_type, compound, effect, rationale, source_url } = body

  const { data, error } = await supabaseAdmin
    .from('absorption_rules')
    .insert({ nutrient_id, rule_type, compound, effect, rationale, source_url })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'absorption_rules',
    row_id: data.id,
    field_changed: 'new_row',
    new_value: JSON.stringify({ compound, rule_type, effect }),
    note: 'Created via admin UI',
  })

  return NextResponse.json(data)
}
