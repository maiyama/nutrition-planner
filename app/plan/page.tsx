'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type SelectedFood = {
  food: { id: number; name: string; food_group: string | null }
  nutrientId: number
  nutrientName: string
  amountRaw: number | null
  amountCooked: number | null
  cookedIsEstimated: boolean
  bestPrepMethod: string
  enhancers: { compound: string; effect: string }[]
  suggestedGrams: number
}

function nutrientAt(amountPer100g: number | null, grams: number): string {
  if (amountPer100g == null) return '—'
  return (amountPer100g * grams / 100).toFixed(1)
}

export default function PlanPage() {
  return <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}><PlanContent /></Suspense>
}

function PlanContent() {
  const searchParams = useSearchParams()
  const goal = searchParams.get('goal') ?? ''
  const [foods, setFoods] = useState<SelectedFood[]>([])

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedFoods')
    if (stored) setFoods(JSON.parse(stored))
  }, [])

  function clearPlan() {
    sessionStorage.removeItem('selectedFoods')
    setFoods([])
  }

  if (foods.length === 0) {
    return (
      <div className="max-w-xl">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Your prep plan</h1>
        <p className="text-sm text-gray-500 mb-4">No foods selected yet.</p>
        <Link href={`/goal?q=${encodeURIComponent(goal)}`} className="text-sm text-green-700 underline">← Back to nutrients</Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Your prep plan</h1>
          <p className="text-xs text-gray-400">Goal: "{goal}"</p>
        </div>
        <button onClick={clearPlan} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear plan</button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Food</th>
              <th className="px-3 py-2">Nutrient</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-right">Nutrient gained</th>
              <th className="px-3 py-2">Best cooking method</th>
              <th className="px-3 py-2">Combine with</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {foods.map((f, i) => (
              <tr key={i} className="align-top">
                <td className="px-3 py-3 font-medium text-gray-800">{f.food.name}</td>
                <td className="px-3 py-3 text-gray-600">{f.nutrientName}</td>
                <td className="px-3 py-3 text-right text-gray-700">{f.suggestedGrams} g</td>
                <td className="px-3 py-3 text-right text-gray-700">
                  <div>{nutrientAt(f.amountCooked ?? f.amountRaw, f.suggestedGrams)}</div>
                  <div className="text-xs text-gray-400">
                    {f.amountCooked != null ? (f.cookedIsEstimated ? 'cooked est.' : 'cooked') : 'raw'}
                  </div>
                </td>
                <td className="px-3 py-3 text-xs text-gray-600 max-w-[220px]">{f.bestPrepMethod}</td>
                <td className="px-3 py-3 text-xs text-gray-600">
                  {f.enhancers.length > 0
                    ? f.enhancers.map(e => (
                        <div key={e.compound} className="text-green-700">+ {e.compound}</div>
                      ))
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {foods.map((f, i) => (
          <div key={i} className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
            <div className="font-medium text-sm text-gray-900">{f.food.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">{f.nutrientName}</div>
            <div className="mt-2 text-xs text-gray-600 space-y-1">
              <div>Amount: <span className="font-medium text-gray-800">{f.suggestedGrams} g</span></div>
              <div>
                Nutrient gained: <span className="font-medium text-gray-800">
                  {nutrientAt(f.amountCooked ?? f.amountRaw, f.suggestedGrams)}
                </span>
                <span className="text-gray-400 ml-1">
                  ({f.amountCooked != null ? (f.cookedIsEstimated ? 'cooked est.' : 'cooked') : 'raw'})
                </span>
              </div>
              <div>Prep: {f.bestPrepMethod}</div>
              {f.enhancers.length > 0 && (
                <div className="text-green-700">+ Combine with: {f.enhancers.map(e => e.compound).join(', ')}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-4 items-center">
        <Link
          href={`/goal?q=${encodeURIComponent(goal)}`}
          className="text-sm text-green-700 underline"
        >
          ← Add more nutrients
        </Link>
        <span className="text-gray-200">|</span>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">Start over</Link>
      </div>

      <p className="mt-6 text-xs text-gray-400 leading-relaxed">
        Amounts are a planning guide, not a prescription. Suggested portions aim for ~25% of RDI per food.
        Consult a registered dietitian for personalised advice, especially if you have a medical condition.
      </p>
    </div>
  )
}
