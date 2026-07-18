'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

type FoodRow = {
  food: { id: number; name: string; food_group: string | null }
  amount_raw: number | null
  amount_cooked: number | null
  cooked_is_estimated: boolean
  pct_rdi: number | null
  best_prep_method: string
  suggested_grams: number
  absorption_enhancers: { compound: string; effect: string; source_url: string }[]
  absorption_inhibitors: { compound: string; effect: string; source_url: string }[]
}

type ApiResponse = {
  nutrient: { id: number; name: string; solubility: string | null; vitamer_form: string | null } | null
  dri: { rda_or_ai: number; unit: string } | null
  foods: FoodRow[]
}

export default function NutrientPage({ params }: { params: Promise<{ nutrientId: string }> }) {
  const { nutrientId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const goal = searchParams.get('goal') ?? ''
  const nutrientName = searchParams.get('nutrientName') ?? ''

  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/foods?nutrientId=${nutrientId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [nutrientId])

  function toggleSelect(foodId: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(foodId) ? next.delete(foodId) : next.add(foodId)
      return next
    })
  }

  function handleContinue() {
    if (!data || selected.size === 0) return
    const selectedFoods = data.foods
      .filter(r => selected.has(r.food.id))
      .map(r => ({
        food: r.food,
        nutrientId: Number(nutrientId),
        nutrientName: data.nutrient?.name ?? nutrientName,
        unit: data.dri?.unit ?? '',
        amountRaw: r.amount_raw,
        amountCooked: r.amount_cooked,
        cookedIsEstimated: r.cooked_is_estimated,
        bestPrepMethod: r.best_prep_method,
        enhancers: r.absorption_enhancers,
        suggestedGrams: r.suggested_grams,
      }))

    const existing = JSON.parse(sessionStorage.getItem('selectedFoods') ?? '[]')
    sessionStorage.setItem('selectedFoods', JSON.stringify([...existing, ...selectedFoods]))
    router.push(`/plan?goal=${encodeURIComponent(goal)}`)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>
  if (!data?.foods?.length) return <p className="text-sm text-gray-500">No food data found for this nutrient.</p>

  const { nutrient, dri, foods } = data

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">
        <a href={`/goal?q=${encodeURIComponent(goal)}`} className="hover:underline">← Back to nutrients</a>
      </p>
      <h2 className="text-lg font-semibold text-gray-900 mb-0.5">
        {nutrient?.name ?? nutrientName}
        {nutrient?.vitamer_form && <span className="ml-2 text-sm text-gray-400 font-normal">{nutrient.vitamer_form}</span>}
      </h2>
      {dri && (
        <p className="text-xs text-gray-500 mb-1">
          RDI: {dri.rda_or_ai} {dri.unit}/day (Health Canada, adults 19–50) · Solubility: {nutrient?.solubility ?? '—'}
        </p>
      )}
      <p className="text-xs text-gray-400 mb-5">Select one or more foods to add to your plan.</p>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 w-6"></th>
              <th className="px-3 py-2">Food</th>
              <th className="px-3 py-2 text-right">Raw (per 100 g)</th>
              <th className="px-3 py-2 text-right">Cooked (per 100 g)</th>
              <th className="px-3 py-2 text-right">% RDI (raw)</th>
              <th className="px-3 py-2">Best prep</th>
              <th className="px-3 py-2">Combine with</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {foods.map(row => (
              <tr
                key={row.food.id}
                onClick={() => toggleSelect(row.food.id)}
                className={`cursor-pointer transition-colors ${selected.has(row.food.id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-3 py-2">
                  <input type="checkbox" readOnly checked={selected.has(row.food.id)} className="accent-green-700" />
                </td>
                <td className="px-3 py-2 font-medium text-gray-800">{row.food.name}</td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {row.amount_raw != null ? `${row.amount_raw} ${dri?.unit ?? ''}` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {row.amount_cooked != null
                    ? <>{row.amount_cooked} {dri?.unit ?? ''}{row.cooked_is_estimated && <span className="text-gray-400 text-xs"> est.</span>}</>
                    : '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  {row.pct_rdi != null
                    ? <span className={row.pct_rdi >= 25 ? 'text-green-700 font-medium' : 'text-gray-600'}>{row.pct_rdi}%</span>
                    : '—'}
                </td>
                <td className="px-3 py-2 text-gray-600 text-xs max-w-[200px]">{row.best_prep_method}</td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {row.absorption_enhancers.length > 0
                    ? row.absorption_enhancers.map(e => e.compound).join(', ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {foods.map(row => (
          <div
            key={row.food.id}
            onClick={() => toggleSelect(row.food.id)}
            className={`border rounded-lg px-4 py-3 cursor-pointer transition-colors ${selected.has(row.food.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" readOnly checked={selected.has(row.food.id)} className="accent-green-700 mt-0.5 shrink-0" />
                <span className="font-medium text-sm text-gray-800">{row.food.name}</span>
              </div>
              {row.pct_rdi != null && (
                <span className={`text-xs font-medium shrink-0 ${row.pct_rdi >= 25 ? 'text-green-700' : 'text-gray-500'}`}>{row.pct_rdi}% RDI</span>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-500 space-y-1 ml-5">
              <div>Raw: {row.amount_raw ?? '—'} {dri?.unit} · Cooked: {row.amount_cooked ?? '—'} {dri?.unit}{row.cooked_is_estimated ? ' (est.)' : ''}</div>
              <div>Prep: {row.best_prep_method}</div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setExpanded(expanded === row.food.id ? null : row.food.id) }}
              className="mt-2 ml-5 text-xs text-green-700 underline"
            >
              {expanded === row.food.id ? 'Hide' : 'Absorption details'}
            </button>
            {expanded === row.food.id && (
              <div className="mt-2 ml-5 text-xs space-y-1">
                {row.absorption_enhancers.map(e => (
                  <div key={e.compound} className="text-green-700">+ Combine with {e.compound}: {e.effect}</div>
                ))}
                {row.absorption_inhibitors.map(e => (
                  <div key={e.compound} className="text-red-600">− Avoid {e.compound}: {e.effect}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleContinue}
          disabled={selected.size === 0}
          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {selected.size === 0 ? 'Select foods to continue' : `Add ${selected.size} food${selected.size > 1 ? 's' : ''} to plan →`}
        </button>
      </div>
    </div>
  )
}
