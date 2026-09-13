import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { searchFoodsByName } from '@/lib/food-search'

// Unlike the public food-nutrients search, this deliberately does not
// exclude any food group or unsafe-raw entries — admin needs to attach a
// portion weight to any row (e.g. "Chicken, raw" is unsafe to *eat* raw but
// still needs a portion weight for "1 boneless breast").
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const result = await searchFoodsByName(supabaseAdmin, name)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ matches: result.matches })
}
