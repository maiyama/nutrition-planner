import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { nutrient_id, rule_type, compound, effect, rationale, source_url, note } = body

  const { data: before } = await supabaseAdmin
    .from('absorption_rules')
    .select('*')
    .eq('id', id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('absorption_rules')
    .update({ nutrient_id, rule_type, compound, effect, rationale, source_url, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'absorption_rules',
    row_id: Number(id),
    field_changed: 'row_update',
    old_value: JSON.stringify(before),
    new_value: JSON.stringify(data),
    note: note ?? 'Updated via admin UI',
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: before } = await supabaseAdmin
    .from('absorption_rules')
    .select('*')
    .eq('id', id)
    .single()

  const { error } = await supabaseAdmin
    .from('absorption_rules')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'absorption_rules',
    row_id: Number(id),
    field_changed: 'deleted',
    old_value: JSON.stringify(before),
    note: 'Deleted via admin UI',
  })

  return NextResponse.json({ ok: true })
}
