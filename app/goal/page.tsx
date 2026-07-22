'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type NutrientGoal = {
  id: number
  nutrient_id: number
  rationale_text: string
  source_url: string
  source_type: string
  nutrient: { id: number; name: string; vitamer_form: string | null; solubility: string | null }
}

function deduplicateByNutrient(goals: NutrientGoal[]): NutrientGoal[] {
  const seen = new Map<number, NutrientGoal>()
  for (const g of goals) {
    if (!seen.has(g.nutrient_id)) seen.set(g.nutrient_id, g)
  }
  return Array.from(seen.values())
}

export default function GoalPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
      <GoalContent />
    </Suspense>
  )
}

function GoalContent() {
  const searchParams = useSearchParams()
  const goal = searchParams.get('q') ?? ''
  const [nutrients, setNutrients] = useState<NutrientGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!goal.trim()) { setLoading(false); return }
    fetch(`/api/nutrients?goal=${encodeURIComponent(goal)}`)
      .then(r => r.json())
      .then(data => {
        setNutrients(deduplicateByNutrient(data.nutrientGoals ?? []))
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [goal])

  if (!goal.trim()) {
    return (
      <p className="text-gray-500 text-sm">
        No goal entered. <Link href="/enter-goal" className="text-green-700 underline">Go back</Link>
      </p>
    )
  }

  if (loading) return <p className="text-sm text-gray-400">Finding relevant nutrients…</p>
  if (error) return <p className="text-sm text-red-500">Error: {error}</p>

  return (
    <div className="max-w-2xl">
      <p className="text-xs text-gray-400 mb-1">Your goal</p>
      <p className="text-gray-800 font-medium mb-6">"{goal}"</p>

      <h2 className="text-lg font-semibold text-gray-900 mb-1">Relevant nutrients</h2>
      <p className="text-sm text-gray-500 mb-5">
        Select a nutrient to see which foods are highest in it and how to prepare them.
      </p>

      {nutrients.length === 0 ? (
        <p className="text-sm text-gray-500">
          No nutrients matched your goal. Try rephrasing — e.g. "improve energy", "support bone health", or "lose weight".
        </p>
      ) : (
        <div className="space-y-3">
          {nutrients.map(ng => (
            <Link
              key={ng.nutrient_id}
              href={`/nutrients/${ng.nutrient_id}?goal=${encodeURIComponent(goal)}&nutrientName=${encodeURIComponent(ng.nutrient.name)}`}
              className="block border border-gray-200 rounded-lg px-4 py-4 bg-white hover:border-green-500 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-900 text-sm">
                    {ng.nutrient.name}
                    {ng.nutrient.vitamer_form && (
                      <span className="ml-2 text-xs text-gray-400 font-normal">{ng.nutrient.vitamer_form}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{ng.rationale_text}</p>
                  <a
                    href={ng.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-green-700 underline mt-1 inline-block"
                  >
                    Source ({ng.source_type.replace('_', ' ')})
                  </a>
                </div>
                <span className="text-gray-300 text-lg mt-0.5 shrink-0">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-100">
        <Link href="/enter-goal" className="text-sm text-gray-400 hover:text-gray-600">← Change goal</Link>
      </div>
    </div>
  )
}
