import Link from 'next/link'

function TopLeaves() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -top-2 -right-4 w-64 h-72 pointer-events-none select-none hidden sm:block"
      viewBox="0 0 260 290"
      fill="none"
    >
      {/* Large back leaf — forest green */}
      <path d="M238,8 C268,48 280,122 258,196 C246,237 218,258 194,245 C170,232 165,184 180,136 C195,88 208,28 238,8Z" fill="#1a4731" opacity="0.13"/>
      <path d="M216,245 C222,196 228,124 238,8" stroke="#1a4731" strokeWidth="1.2" opacity="0.18" fill="none"/>
      {/* Medium leaf — fern */}
      <path d="M195,55 C222,78 236,140 220,198 C210,230 184,246 162,232 C140,218 136,174 150,136 C164,98 168,50 195,55Z" fill="#2d6a4f" opacity="0.18"/>
      <path d="M178,232 C184,188 186,132 195,55" stroke="#2d6a4f" strokeWidth="1.1" opacity="0.22" fill="none"/>
      {/* Front leaf — sage */}
      <path d="M138,100 C164,114 178,162 164,206 C154,230 130,238 111,224 C92,210 91,172 102,148 C113,124 113,92 138,100Z" fill="#52b788" opacity="0.36"/>
      <path d="M138,224 C138,186 134,144 138,100" stroke="#52b788" strokeWidth="1" opacity="0.42" fill="none"/>
      {/* Yellow blob */}
      <path d="M208,150 C226,144 244,160 240,184 C236,202 220,208 204,198 C188,188 189,165 208,150Z" fill="#ffd166" opacity="0.52"/>
      {/* Coral small leaf */}
      <path d="M158,66 C170,59 182,70 179,86 C176,98 162,103 151,95 C140,87 145,72 158,66Z" fill="#ef476f" opacity="0.35"/>
    </svg>
  )
}

function BottomLeaves() {
  return (
    <svg
      aria-hidden="true"
      className="absolute -bottom-2 -left-4 w-36 h-44 pointer-events-none select-none hidden sm:block"
      viewBox="0 0 145 178"
      fill="none"
    >
      <path d="M18,178 C30,150 46,108 34,64 C28,42 12,30 0,48 C-12,66 0,122 18,178Z" fill="#2d6a4f" opacity="0.11"/>
      <path d="M65,178 C72,148 80,104 67,60 C60,38 44,28 35,46 C26,64 36,120 65,178Z" fill="#1a4731" opacity="0.09"/>
      <path d="M104,178 C108,162 112,140 106,114 C102,98 90,90 82,100 C74,110 80,144 104,178Z" fill="#ffd166" opacity="0.2"/>
    </svg>
  )
}

export default function LandingPage() {
  return (
    <div className="relative min-h-[68vh] overflow-hidden">
      <TopLeaves />
      <BottomLeaves />

      <div className="relative z-10 max-w-md pt-4">
        <h1 className="text-3xl font-bold text-forest mb-2 leading-tight">
          What brings you here today?
        </h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Understand the science behind your food — nutrients, absorption, and prep — all in one place.
        </p>

        <div className="space-y-3">
          <Link href="/enter-goal" className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
            <div className="flex">
              <div className="w-1.5 shrink-0 bg-sun group-hover:w-2 transition-all duration-200" />
              <div className="px-5 py-5">
                <p className="font-semibold text-forest text-[15px] mb-1">I have a health goal</p>
                <p className="text-sm text-gray-500">e.g. lose weight, improve energy, support bone health</p>
              </div>
            </div>
          </Link>

          <Link href="/food" className="group block bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100">
            <div className="flex">
              <div className="w-1.5 shrink-0 bg-coral group-hover:w-2 transition-all duration-200" />
              <div className="px-5 py-5">
                <p className="font-semibold text-forest text-[15px] mb-1">I have a food in mind</p>
                <p className="text-sm text-gray-500">e.g. Swiss chard, salmon, lentils — see what nutrients it contains</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
