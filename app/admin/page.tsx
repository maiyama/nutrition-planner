'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

type AbsorptionRule = {
  id: number
  nutrient_id: number
  rule_type: 'enhancer' | 'inhibitor'
  compound: string
  effect: string
  rationale: string
  source_url: string
  nutrient?: { id: number; name: string }
}

type Nutrient = {
  id: number
  name: string
  vitamer_form: string | null
  solubility: string | null
  stable_heat: boolean
  stable_light: boolean
  stable_ph: boolean
  stable_oxygen: boolean
  stable_sulfite: boolean
}

const STABILITY_FLAGS = [
  { key: 'stable_heat',    label: 'Heat' },
  { key: 'stable_light',   label: 'Light' },
  { key: 'stable_ph',      label: 'pH' },
  { key: 'stable_oxygen',  label: 'Oxygen' },
  { key: 'stable_sulfite', label: 'Sulfite' },
] as const

// ── FDC Loader (existing) ──────────────────────────────────────────────────

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

type LoadResult = {
  label: string; foodsLoaded: number; nutrientsLoaded: number
  errors: string[]; status: 'success' | 'error'; message?: string
}

function FdcLoader() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<LoadResult[]>([])
  const [current, setCurrent] = useState('')

  async function loadAll() {
    setLoading(true); setResults([])
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
          label: cat.label, foodsLoaded: data.foodsLoaded ?? 0,
          nutrientsLoaded: data.nutrientsLoaded ?? 0,
          errors: data.errors ?? (data.error ? [data.error] : []),
          status: res.ok ? 'success' : 'error', message: data.error,
        }])
      } catch (e) {
        setResults(prev => [...prev, { label: cat.label, foodsLoaded: 0, nutrientsLoaded: 0, errors: [], status: 'error', message: String(e) }])
      }
    }
    setCurrent(''); setLoading(false)
  }

  const totalFoods = results.reduce((s, r) => s + r.foodsLoaded, 0)
  const totalNutrients = results.reduce((s, r) => s + r.nutrientsLoaded, 0)

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Fetches Foundation Foods from USDA FoodData Central. Safe to re-run — existing records are updated, not duplicated.</p>
      <button onClick={loadAll} disabled={loading}
        className="bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        {loading ? `Loading: ${current}…` : 'Load all food categories'}
      </button>
      {results.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {loading ? 'In progress…' : `Done — ${totalFoods} foods, ${totalNutrients} nutrient values loaded`}
          </p>
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Foods</th><th className="px-3 py-2 text-right">Nutrients</th><th className="px-3 py-2">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map(r => (
                <tr key={r.label}>
                  <td className="px-3 py-2 text-gray-800">{r.label}</td>
                  <td className="px-3 py-2 text-right">{r.foodsLoaded}</td>
                  <td className="px-3 py-2 text-right">{r.nutrientsLoaded}</td>
                  <td className="px-3 py-2 text-xs">
                    {r.status === 'error' ? <span className="text-red-600">{r.message}</span>
                      : r.errors.length > 0 ? <span className="text-amber-600">{r.errors[0]}</span>
                      : <span className="text-green-700">OK</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Absorption Rules ───────────────────────────────────────────────────────

type NewRule = { nutrient_id: string; rule_type: 'enhancer' | 'inhibitor'; compound: string; effect: string; rationale: string; source_url: string }
const EMPTY_RULE: NewRule = { nutrient_id: '', rule_type: 'enhancer', compound: '', effect: '', rationale: '', source_url: '' }

function AbsorptionRulesEditor({ nutrients }: { nutrients: Nutrient[] }) {
  const [rules, setRules] = useState<AbsorptionRule[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<AbsorptionRule>>({})
  const [editNote, setEditNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [newRule, setNewRule] = useState<NewRule>({ ...EMPTY_RULE })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { fetch('/api/admin/absorption-rules').then(r => r.json()).then(setRules) }, [])

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveEdit(id: number) {
    setSaving(true)
    const res = await fetch(`/api/admin/absorption-rules/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editDraft, note: editNote }),
    })
    const updated = await res.json()
    setRules(prev => prev.map(r => r.id === id ? { ...updated, nutrient: r.nutrient } : r))
    setEditingId(null); setSaving(false); flash('Saved.')
  }

  async function deleteRule(id: number, compound: string) {
    if (!confirm(`Delete rule for "${compound}"?`)) return
    await fetch(`/api/admin/absorption-rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id)); flash('Deleted.')
  }

  async function addRule() {
    setSaving(true)
    const res = await fetch('/api/admin/absorption-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newRule, nutrient_id: Number(newRule.nutrient_id) }),
    })
    const created = await res.json()
    const nutrient = nutrients.find(n => n.id === Number(newRule.nutrient_id))
    setRules(prev => [...prev, { ...created, nutrient }])
    setNewRule({ ...EMPTY_RULE }); setAdding(false); setSaving(false); flash('Added.')
  }

  return (
    <div>
      {msg && <p className="mb-3 text-sm text-green-700 font-medium">{msg}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Nutrient</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Compound</th>
              <th className="px-3 py-2">Effect</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map(rule => editingId === rule.id ? (
              <tr key={rule.id} className="bg-yellow-50">
                <td className="px-3 py-2">
                  <select value={editDraft.nutrient_id ?? rule.nutrient_id} onChange={e => setEditDraft(d => ({ ...d, nutrient_id: Number(e.target.value) }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs w-full">
                    {nutrients.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={editDraft.rule_type ?? rule.rule_type} onChange={e => setEditDraft(d => ({ ...d, rule_type: e.target.value as 'enhancer' | 'inhibitor' }))}
                    className="border border-gray-300 rounded px-2 py-1 text-xs">
                    <option value="enhancer">enhancer</option>
                    <option value="inhibitor">inhibitor</option>
                  </select>
                </td>
                <td className="px-3 py-2"><input value={editDraft.compound ?? rule.compound} onChange={e => setEditDraft(d => ({ ...d, compound: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-full" /></td>
                <td className="px-3 py-2"><input value={editDraft.effect ?? rule.effect} onChange={e => setEditDraft(d => ({ ...d, effect: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-full" /></td>
                <td className="px-3 py-2"><input value={editDraft.source_url ?? rule.source_url} onChange={e => setEditDraft(d => ({ ...d, source_url: e.target.value }))} className="border border-gray-300 rounded px-2 py-1 text-xs w-full" placeholder="https://..." /></td>
                <td className="px-3 py-2 space-y-1">
                  <input value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Change note (optional)" className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(rule.id)} disabled={saving} className="text-xs bg-green-700 text-white px-2 py-1 rounded">{saving ? '…' : 'Save'}</button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700">{rule.nutrient?.name ?? rule.nutrient_id}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium ${rule.rule_type === 'enhancer' ? 'text-green-700' : 'text-red-600'}`}>{rule.rule_type}</span>
                </td>
                <td className="px-3 py-2 text-gray-800 font-medium">{rule.compound}</td>
                <td className="px-3 py-2 text-gray-600 max-w-[200px]">{rule.effect}</td>
                <td className="px-3 py-2">
                  {rule.source_url
                    ? <a href={rule.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-700 underline">link</a>
                    : <span className="text-xs text-red-500 font-medium">missing</span>}
                </td>
                <td className="px-3 py-2 flex gap-2">
                  <button onClick={() => { setEditingId(rule.id); setEditDraft({ ...rule }); setEditNote('') }} className="text-xs text-blue-600 hover:underline">Edit</button>
                  <button onClick={() => deleteRule(rule.id, rule.compound)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding ? (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <p className="text-sm font-medium text-gray-800 mb-3">New absorption rule</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nutrient</label>
              <select value={newRule.nutrient_id} onChange={e => setNewRule(r => ({ ...r, nutrient_id: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="">Select nutrient…</option>
                {nutrients.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Type</label>
              <select value={newRule.rule_type} onChange={e => setNewRule(r => ({ ...r, rule_type: e.target.value as 'enhancer' | 'inhibitor' }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full">
                <option value="enhancer">Enhancer (combine with)</option>
                <option value="inhibitor">Inhibitor (avoid with)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Compound</label>
              <input value={newRule.compound} onChange={e => setNewRule(r => ({ ...r, compound: e.target.value }))} placeholder="e.g. Vitamin C" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Effect (short)</label>
              <input value={newRule.effect} onChange={e => setNewRule(r => ({ ...r, effect: e.target.value }))} placeholder="e.g. Increases absorption 3-fold" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Rationale (mechanism)</label>
              <textarea value={newRule.rationale} onChange={e => setNewRule(r => ({ ...r, rationale: e.target.value }))} rows={2} placeholder="Explain the biochemical mechanism…" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Source URL (required)</label>
              <input value={newRule.source_url} onChange={e => setNewRule(r => ({ ...r, source_url: e.target.value }))} placeholder="https://pubmed.ncbi.nlm.nih.gov/…" className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full" />
            </div>
          </div>
          <div className="flex gap-3 mt-3">
            <button onClick={addRule} disabled={saving || !newRule.nutrient_id || !newRule.compound || !newRule.source_url}
              className="bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Add rule'}
            </button>
            <button onClick={() => setAdding(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-4 text-sm text-green-700 underline">+ Add new rule</button>
      )}
    </div>
  )
}

// ── Stability Flags ────────────────────────────────────────────────────────

function StabilityEditor({ nutrients: initial }: { nutrients: Nutrient[] }) {
  const [nutrients, setNutrients] = useState<Nutrient[]>(initial)
  const [saving, setSaving] = useState<number | null>(null)
  const [msg, setMsg] = useState('')

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  async function saveNutrient(n: Nutrient) {
    setSaving(n.id)
    await fetch(`/api/admin/nutrients/${n.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stable_heat: n.stable_heat, stable_light: n.stable_light, stable_ph: n.stable_ph, stable_oxygen: n.stable_oxygen, stable_sulfite: n.stable_sulfite }),
    })
    setSaving(null); flash(`Saved ${n.name}.`)
  }

  function toggleFlag(id: number, flag: keyof Nutrient) {
    setNutrients(prev => prev.map(n => n.id === id ? { ...n, [flag]: !n[flag as keyof Nutrient] } : n))
  }

  return (
    <div>
      {msg && <p className="mb-3 text-sm text-green-700 font-medium">{msg}</p>}
      <p className="text-sm text-gray-500 mb-4">Toggle stability. <span className="text-green-700 font-medium">Green = stable</span>, <span className="text-red-500 font-medium">red = unstable/sensitive</span>. Click Save after changing a row.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-xs text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Nutrient</th>
              {STABILITY_FLAGS.map(f => <th key={f.key} className="px-3 py-2 text-center">{f.label}</th>)}
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {nutrients.map(n => (
              <tr key={n.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-800">{n.name}</td>
                {STABILITY_FLAGS.map(f => (
                  <td key={f.key} className="px-3 py-2 text-center">
                    <button
                      onClick={() => toggleFlag(n.id, f.key as keyof Nutrient)}
                      className={`w-6 h-6 rounded text-xs font-bold transition-colors ${n[f.key as keyof Nutrient] ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                    >
                      {n[f.key as keyof Nutrient] ? '✓' : '✗'}
                    </button>
                  </td>
                ))}
                <td className="px-3 py-2">
                  <button onClick={() => saveNutrient(n)} disabled={saving === n.id}
                    className="text-xs bg-green-700 disabled:bg-gray-400 text-white px-2 py-1 rounded">
                    {saving === n.id ? '…' : 'Save'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Admin Page ────────────────────────────────────────────────────────

const TABS = ['FDC Data', 'Absorption Rules', 'Stability Flags'] as const
type Tab = typeof TABS[number]

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('FDC Data')
  const [nutrients, setNutrients] = useState<Nutrient[]>([])

  useEffect(() => {
    fetch('/api/admin/nutrients').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setNutrients(data)
    })
  }, [])

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Admin</h1>
      <p className="text-sm text-gray-500 mb-6">Internal tools for loading and managing reference data.</p>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-green-700 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'FDC Data' && <FdcLoader />}
      {tab === 'Absorption Rules' && <AbsorptionRulesEditor nutrients={nutrients} />}
      {tab === 'Stability Flags' && <StabilityEditor nutrients={nutrients} />}
    </div>
  )
}
