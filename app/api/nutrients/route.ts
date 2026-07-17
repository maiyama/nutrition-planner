import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Goal keyword → goal_tag mapping
const KEYWORD_TO_TAG: { keywords: string[]; tag: string }[] = [
  { keywords: ['weight', 'lose', 'fat', 'slim', 'muscle', 'lean', 'body'], tag: 'weight_loss_muscle_retention' },
  { keywords: ['energy', 'tired', 'fatigue', 'exhausted', 'sluggish'],     tag: 'energy_levels' },
  { keywords: ['bone', 'osteoporosis', 'calcium', 'fracture', 'density'],  tag: 'bone_health' },
  { keywords: ['immune', 'immunity', 'sick', 'infection', 'cold', 'flu'],  tag: 'immune_support' },
  { keywords: ['iron', 'anaemia', 'anemia', 'anaemic', 'anemic'],          tag: 'iron_deficiency' },
]

function matchTags(goal: string): string[] {
  const lower = goal.toLowerCase()
  const tags = new Set<string>()
  for (const { keywords, tag } of KEYWORD_TO_TAG) {
    if (keywords.some(k => lower.includes(k))) tags.add(tag)
  }
  return tags.size > 0 ? Array.from(tags) : ['energy_levels'] // default fallback
}

export async function GET(req: NextRequest) {
  const goal = req.nextUrl.searchParams.get('goal') ?? ''
  const tags = matchTags(goal)

  const { data, error } = await supabase
    .from('nutrient_goals')
    .select('*, nutrient:nutrients(*)')
    .in('goal_tag', tags)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ goal, tags, nutrientGoals: data })
}
