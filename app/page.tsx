import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Where do you want to start?</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Understand what your body needs — mapped to real food, with the science made explicit.
      </p>
      <div className="space-y-3">
        <Link
          href="/enter-goal"
          className="block border border-gray-200 rounded-xl px-6 py-5 bg-white hover:border-green-500 hover:shadow-sm transition-all"
        >
          <div className="font-semibold text-gray-900 mb-1">I have a health goal</div>
          <p className="text-sm text-gray-500">e.g. lose weight, improve energy, support bone health</p>
        </Link>
        <Link
          href="/food"
          className="block border border-gray-200 rounded-xl px-6 py-5 bg-white hover:border-green-500 hover:shadow-sm transition-all"
        >
          <div className="font-semibold text-gray-900 mb-1">I have a food in mind</div>
          <p className="text-sm text-gray-500">e.g. Swiss chard, salmon, lentils — see what nutrients it contains</p>
        </Link>
      </div>
    </div>
  )
}
