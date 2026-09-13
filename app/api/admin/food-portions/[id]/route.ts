import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { modifier, grams, note } = body as { modifier: string; grams: number; note?: string }

  const { data: before } = await supabaseAdmin.from('food_portions').select('*').eq('id', id).single()

  const { data, error } = await supabaseAdmin
    .from('food_portions')
    .update({ modifier, grams, note: note || null })
    .eq('id', id)
    .select('*, food:foods(id, name, food_group)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'food_portions',
    row_id: Number(id),
    field_changed: 'row_update',
    old_value: JSON.stringify(before),
    new_value: JSON.stringify(data),
    note: 'Updated via admin UI',
  })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: before } = await supabaseAdmin.from('food_portions').select('*').eq('id', id).single()

  const { error } = await supabaseAdmin.from('food_portions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'food_portions',
    row_id: Number(id),
    field_changed: 'deleted',
    old_value: JSON.stringify(before),
    note: 'Deleted via admin UI',
  })

  return NextResponse.json({ ok: true })
}
