'use client'

import { useState } from 'react'

const FOOD_CATEGORIES = [
  { label: 'Beef & Pork',      query: 'beef pork',              foodGroup: 'Meat' },
  { label: 'Chicken & Turkey', query: 'chicken turkey',          foodGroup: 'Poultry' },
  { label: 'Fish & Seafood',   query: 'salmon tuna fish shrimp', foodGroup: 'Seafood' },
  { label: 'Eggs & Dairy',     query: 'egg milk cheese yogurt',  foodGroup: 'Dairy & Eggs' },
  { label: 'Leafy Greens',     query: 'spinach kale chard',      foodGroup: 'Vegetables' },
  { label: 'Other Vegetables', query: 'broccoli carrot potato',  foodGroup: 'Vegetables' },
  { label: 'Legumes',          query: 'lentils beans chickpeas', foodGroup: 'Legumes' },
  { label: 'Nuts & Seeds',     query: 'almonds walnuts sunflower seeds', foodGroup: 'Nuts & Seeds' },
  { label: 'Whole Grains',     query: 'oats brown rice quinoa',  foodGroup: 'Grains' },
  { label: 'Fruits',           query: 'orange berries banana apple', foodGroup: 'Fruits' },
]

type Result = {
  label: string
  foodsLoaded: number
  nutrientsLoaded: number
  errors: string[]
  status: 'success' | 'error'
  message?: string
}

export default function AdminPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [current, setCurrent] = useState('')

  async function loadAll() {
    setLoading(true)
    setResults([])

    for (const cat of FOOD_CATEGORIES) {
      setCurrent(cat.label)
      try {
        const res = await fetch('/api/admin/load-fdc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: cat.query, foodGroup: cat.foodGroup }),
        })
        const data = await res.json()
        setResults(prev => [...prev, {
          label: cat.label,
          foodsLoaded: data.foodsLoaded ?? 0,
          nutrientsLoaded: data.nutrientsLoaded ?? 0,
          errors: data.errors ?? (data.error ? [data.error] : []),
          status: res.ok ? 'success' : 'error',
          message: data.error,
        }])
      } catch (e) {
        setResults(prev => [...prev, {
          label: cat.label,
          foodsLoaded: 0,
          nutrientsLoaded: 0,
          errors: [],
          status: 'error',
          message: String(e),
        }])
      }
    }

    setCurrent('')
    setLoading(false)
  }

  const totalFoods = results.reduce((s, r) => s + r.foodsLoaded, 0)
  const totalNutrients = results.reduce((s, r) => s + r.nutrientsLoaded, 0)

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Admin</h1>
      <p className="text-sm text-gray-500 mb-8">Internal tools for loading and managing reference data.</p>

      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Load FDC Food Data</h2>
        <p className="text-sm text-gray-500 mb-4">
          Fetches Foundation Foods from the USDA FoodData Central API and saves them to the database.
          Safe to re-run — existing records are updated, not duplicated.
        </p>

        <button
          onClick={loadAll}
          disabled={loading}
          className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {loading ? `Loading: ${current}…` : 'Load all food categories'}
        </button>

        {results.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">
              {loading ? 'In progress…' : `Done — ${totalFoods} foods, ${totalNutrients} nutrient values loaded`}
            </div>
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium text-gray-600">Category</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Foods</th>
                  <th className="px-3 py-2 font-medium text-gray-600 text-right">Nutrients</th>
                  <th className="px-3 py-2 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.map(r => (
                  <tr key={r.label}>
                    <td className="px-3 py-2 text-gray-800">{r.label}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.foodsLoaded}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{r.nutrientsLoaded}</td>
                    <td className="px-3 py-2">
                      {r.status === 'error' ? (
                        <span className="text-red-600 text-xs">{r.message}</span>
                      ) : r.errors.length > 0 ? (
                        <details>
                          <summary className="text-amber-600 cursor-pointer text-xs">{r.errors.length} errors — click to expand</summary>
                          <ul className="mt-1 text-xs text-red-600 space-y-0.5">
                            {r.errors.map((e, i) => <li key={i}>{e}</li>)}
                          </ul>
                        </details>
                      ) : (
                        <span className="text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
