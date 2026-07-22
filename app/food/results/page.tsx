'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

type NutrientRow = {
  nutrient: { id: number; name: string; solubility: string | null; vitamer_form: string | null }
  amount_per_100g: number
  unit: string
  pct_rdi: number | null
  best_prep_method: string
  enhancers: { compound: string; effect: string }[]
  inhibitors: { compound: string; effect: string }[]
}

type ApiResponse = {
  food: { id: number; name: string; food_group: string | null } | null
  nutrients: NutrientRow[]
  error?: string
}

export default function FoodResultsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-400">Loading…</p>}>
      <FoodResultsContent />
    </Suspense>
  )
}

function FoodResultsContent() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? ''
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    if (!name.trim()) { setLoading(false); return }
    fetch(`/api/food-nutrients?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [name])

  if (!name.trim()) {
    return <p className="text-sm text-gray-500">No food entered. <a href="/food" className="text-green-700 underline">Go back</a></p>
  }

  if (loading) return <p className="text-sm text-gray-400">Looking up "{name}"…</p>

  if (!data?.food) {
    return (
      <div className="max-w-xl">
        <p className="text-xs text-gray-400 mb-4"><a href="/food" className="hover:underline">← Try another food</a></p>
        <p className="text-gray-700 font-medium mb-1">"{name}" wasn't found in the database.</p>
        <p className="text-sm text-gray-500">Try a simpler name (e.g. "chard" instead of "Swiss chard") or check the spelling.</p>
      </div>
    )
  }

  if (data.nutrients.length === 0) {
    return (
      <div className="max-w-xl">
        <p className="text-xs text-gray-400 mb-4"><a href="/food" className="hover:underline">← Try another food</a></p>
        <p className="text-gray-700 font-medium mb-1">Found <span className="text-gray-900">{data.food.name}</span></p>
        <p className="text-sm text-gray-500 mt-2">No nutrient data loaded for this food yet. Run the FDC loader in Admin to populate it.</p>
      </div>
    )
  }

  const { food, nutrients } = data

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">
        <a href="/food" className="hover:underline">← Look up another food</a>
      </p>
      <h2 className="text-lg font-semibold text-gray-900 mb-0.5">{food.name}</h2>
      {food.food_group && <p className="text-xs text-gray-400 mb-1">{food.food_group}</p>}
      <p className="text-xs text-gray-500 mb-5">Top {nutrients.length} nutrients per 100 g (raw), ranked by amount.</p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">Nutrient</th>
              <th className="px-3 py-2 text-right">Per 100 g</th>
              <th className="px-3 py-2 text-right">% RDI</th>
              <th className="px-3 py-2">Best prep</th>
              <th className="px-3 py-2">Combine with</th>
              <th className="px-3 py-2">Avoid with</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {nutrients.map(row => (
              <tr key={row.nutrient.id} className="align-top">
                <td className="px-3 py-2 font-medium text-gray-800">
                  {row.nutrient.name}
                  {row.nutrient.vitamer_form && (
                    <span className="ml-1 text-xs text-gray-400 font-normal">{row.nutrient.vitamer_form}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-700 whitespace-nowrap">
                  {row.amount_per_100g} {row.unit}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {row.pct_rdi != null
                    ? <span className={row.pct_rdi >= 25 ? 'text-green-700 font-medium' : 'text-gray-600'}>{row.pct_rdi}%</span>
                    : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px]">{row.best_prep_method}</td>
                <td className="px-3 py-2 text-xs text-green-700">
                  {row.enhancers.length > 0 ? row.enhancers.map(e => e.compound).join(', ') : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-red-600">
                  {row.inhibitors.length > 0 ? row.inhibitors.map(e => e.compound).join(', ') : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {nutrients.map(row => (
          <div key={row.nutrient.id} className="border border-gray-200 rounded-lg px-4 py-3 bg-white">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-sm text-gray-800">{row.nutrient.name}</span>
                {row.nutrient.vitamer_form && (
                  <span className="ml-1 text-xs text-gray-400">{row.nutrient.vitamer_form}</span>
                )}
              </div>
              {row.pct_rdi != null && (
                <span className={`text-xs font-medium shrink-0 ${row.pct_rdi >= 25 ? 'text-green-700' : 'text-gray-500'}`}>
                  {row.pct_rdi}% RDI
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {row.amount_per_100g} {row.unit} per 100 g
            </div>
            <div className="mt-1 text-xs text-gray-500">Prep: {row.best_prep_method}</div>
            {(row.enhancers.length > 0 || row.inhibitors.length > 0) && (
              <button
                onClick={() => setExpanded(expanded === row.nutrient.id ? null : row.nutrient.id)}
                className="mt-2 text-xs text-green-700 underline"
              >
                {expanded === row.nutrient.id ? 'Hide' : 'Absorption details'}
              </button>
            )}
            {expanded === row.nutrient.id && (
              <div className="mt-1 text-xs space-y-0.5">
                {row.enhancers.map(e => (
                  <div key={e.compound} className="text-green-700">+ Combine with {e.compound}: {e.effect}</div>
                ))}
                {row.inhibitors.map(e => (
                  <div key={e.compound} className="text-red-600">− Avoid {e.compound}: {e.effect}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-xs text-gray-400 leading-relaxed space-y-1">
        <p><span className="font-medium text-gray-500">% RDI:</span> percentage of the Health Canada recommended daily intake (adults 19–50) provided by 100 g of this food, raw.</p>
        <p>This is a planning guide, not a prescription. Consult a registered dietitian for personalised advice.</p>
      </div>
    </div>
  )
}
