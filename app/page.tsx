export default function Home() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">What's your health goal?</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Describe what you're trying to achieve. We'll map it to the nutrients that matter and show you how to get them from food.
      </p>
      <form action="/goal" method="GET">
        <textarea
          name="q"
          rows={4}
          placeholder="e.g. lose weight while keeping muscle, improve energy levels, support bone health..."
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
        />
        <button
          type="submit"
          className="mt-3 w-full bg-green-700 hover:bg-green-800 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Show relevant nutrients
        </button>
      </form>
    </div>
  );
}
