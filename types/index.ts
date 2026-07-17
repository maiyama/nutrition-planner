export type Nutrient = {
  id: number
  name: string
  vitamer_form: string | null
  solubility: 'water' | 'fat' | null
  stable_heat: boolean
  stable_light: boolean
}

export type NutrientGoal = {
  id: number
  nutrient_id: number
  goal_tag: string
  rationale_text: string
  source_url: string
  source_type: string
  nutrient: Nutrient
}

export type Food = {
  id: number
  fdc_id: number
  name: string
  food_group: string | null
}

export type FoodNutrient = {
  id: number
  food_id: number
  nutrient_id: number
  amount_per_100g: number
  state: 'raw' | 'cooked'
  source: string
}

export type AbsorptionRule = {
  id: number
  nutrient_id: number
  rule_type: 'enhancer' | 'inhibitor'
  compound: string
  effect: string
  rationale: string
  source_url: string
}

export type DriValue = {
  id: number
  nutrient_id: number
  age_group: string
  sex: string
  rda_or_ai: number
  unit: string
}

export type FoodRow = {
  food: Food
  amount_raw: number | null
  amount_cooked: number | null
  cooked_is_estimated: boolean
  pct_rdi: number | null
  best_prep_method: string
  absorption_enhancers: { compound: string; effect: string; source_url: string }[]
  absorption_inhibitors: { compound: string; effect: string; source_url: string }[]
}

export type SelectedFood = {
  food: Food
  nutrientId: number
  nutrientName: string
  amountRaw: number | null
  amountCooked: number | null
  bestPrepMethod: string
  enhancers: { compound: string; effect: string }[]
  suggestedGrams: number
}
