import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { stable_heat, stable_light, stable_ph, stable_oxygen, stable_sulfite, note } = body

  const { data: before } = await supabaseAdmin
    .from('nutrients')
    .select('*')
    .eq('id', id)
    .single()

  const { data, error } = await supabaseAdmin
    .from('nutrients')
    .update({ stable_heat, stable_light, stable_ph, stable_oxygen, stable_sulfite })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('admin_change_log').insert({
    table_name: 'nutrients',
    row_id: Number(id),
    field_changed: 'stability_flags',
    old_value: JSON.stringify({ stable_heat: before?.stable_heat, stable_light: before?.stable_light, stable_ph: before?.stable_ph, stable_oxygen: before?.stable_oxygen, stable_sulfite: before?.stable_sulfite }),
    new_value: JSON.stringify({ stable_heat, stable_light, stable_ph, stable_oxygen, stable_sulfite }),
    note: note ?? 'Updated via admin UI',
  })

  return NextResponse.json(data)
}
