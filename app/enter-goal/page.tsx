'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function EnterGoalPage() {
  const [goal, setGoal] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (goal.trim()) router.push(`/goal?q=${encodeURIComponent(goal.trim())}`)
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs text-gray-400 mb-4">
        <a href="/" className="hover:text-fern transition-colors">← Back</a>
      </p>
      <h1 className="text-2xl font-bold text-forest mb-2">What&apos;s your health goal?</h1>
      <p className="text-gray-500 mb-6 text-sm leading-relaxed">
        Describe what you&apos;re trying to achieve. We&apos;ll map it to the nutrients that matter and show you how to get them from food.
      </p>
      <form onSubmit={handleSubmit}>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          rows={4}
          placeholder="e.g. lose weight while keeping muscle, improve energy levels, support bone health..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-fern resize-none shadow-sm"
        />
        <button
          type="submit"
          disabled={!goal.trim()}
          className="mt-3 w-full bg-forest hover:bg-fern disabled:bg-gray-200 disabled:text-gray-400 text-white font-medium py-2.5 rounded-xl transition-colors"
        >
          Show relevant nutrients
        </button>
      </form>
    </div>
  )
}
