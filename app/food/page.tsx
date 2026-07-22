'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FoodPage() {
  const [food, setFood] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (food.trim()) router.push(`/food/results?name=${encodeURIComponent(food.trim())}`)
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs text-gray-400 mb-4">
        <a href="/" className="hover:text-fern transition-colors">← Back</a>
      </p>
      <h1 className="text-2xl font-bold text-forest mb-2">What food are you curious about?</h1>
      <p className="text-gray-500 mb-6 text-sm leading-relaxed">
        Enter a food name to see its top nutrients, how much they cover your daily needs, and the best way to prepare it.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          value={food}
          onChange={e => setFood(e.target.value)}
          type="text"
          placeholder="e.g. Swiss chard, salmon, lentils..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fern shadow-sm"
        />
        <button
          type="submit"
          disabled={!food.trim()}
          className="mt-3 w-full bg-forest hover:bg-fern disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          Show nutrients
        </button>
      </form>
    </div>
  )
}
