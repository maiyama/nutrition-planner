-- Nutrients reference table
create table nutrients (
  id serial primary key,
  name text not null,
  vitamer_form text,
  solubility text check (solubility in ('water', 'fat')),
  stable_heat boolean default true,
  stable_light boolean default true,
  stable_ph boolean default true,
  stable_oxygen boolean default true,
  stable_sulfite boolean default true
);

-- Goal tags → nutrient mappings (with citations)
create table nutrient_goals (
  id serial primary key,
  nutrient_id integer references nutrients(id) on delete cascade,
  goal_tag text not null,
  rationale_text text not null,
  source_url text not null,
  source_type text check (source_type in ('peer_reviewed', 'government', 'database'))
);

-- Foods (populated from FDC)
create table foods (
  id serial primary key,
  fdc_id integer unique not null,
  name text not null,
  food_group text
);

-- Nutrient amounts per food (raw and cooked)
create table food_nutrients (
  id serial primary key,
  food_id integer references foods(id) on delete cascade,
  nutrient_id integer references nutrients(id) on delete cascade,
  amount_per_100g numeric not null,
  state text check (state in ('raw', 'cooked')) not null,
  source text default 'FDC'
);

-- Retention factors from USDA (cooking method × food group × nutrient)
create table retention_factors (
  id serial primary key,
  food_group text not null,
  prep_method text not null,
  nutrient_id integer references nutrients(id) on delete cascade,
  retention_pct numeric not null check (retention_pct between 0 and 100)
);

-- Absorption enhancers/inhibitors (with citations)
create table absorption_rules (
  id serial primary key,
  nutrient_id integer references nutrients(id) on delete cascade,
  rule_type text check (rule_type in ('enhancer', 'inhibitor')) not null,
  compound text not null,
  effect text not null,
  rationale text not null,
  source_url text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Health Canada DRI values
create table dri_values (
  id serial primary key,
  nutrient_id integer references nutrients(id) on delete cascade,
  age_group text not null,
  sex text check (sex in ('male', 'female', 'all')) not null,
  rda_or_ai numeric not null,
  unit text not null
);

-- Change log for admin edits
create table admin_change_log (
  id serial primary key,
  table_name text not null,
  row_id integer not null,
  field_changed text not null,
  old_value text,
  new_value text,
  changed_at timestamptz default now(),
  note text
);

-- Seed: nutrients
insert into nutrients (name, vitamer_form, solubility, stable_heat, stable_light, stable_ph, stable_oxygen, stable_sulfite) values
  ('Vitamin B1', 'Thiamine', 'water', false, true, false, true, false),
  ('Vitamin B2', 'Riboflavin', 'water', true, false, true, true, true),
  ('Vitamin B6', 'Pyridoxine/Pyridoxal/Pyridoxamine', 'water', true, false, true, true, true),
  ('Vitamin C', 'Ascorbic acid', 'water', false, false, false, false, true),
  ('Vitamin A', 'Retinol/Beta-carotene', 'fat', false, false, false, false, true),
  ('Vitamin D', 'Cholecalciferol', 'fat', true, false, true, false, true),
  ('Vitamin E', 'Alpha-tocopherol', 'fat', true, false, true, false, true),
  ('Vitamin K', 'Phylloquinone', 'fat', true, false, true, false, true),
  ('Iron', 'Non-heme/Heme', 'water', true, true, true, true, true),
  ('Calcium', 'Calcium', 'water', true, true, true, true, true),
  ('Protein', 'Amino acids', 'water', true, true, true, true, true),
  ('Magnesium', 'Magnesium', 'water', true, true, true, true, true);

-- Seed: nutrient_goals (goal_tag → nutrient mapping with citations)
insert into nutrient_goals (nutrient_id, goal_tag, rationale_text, source_url, source_type) values
  -- Weight loss / muscle retention
  (11, 'weight_loss_muscle_retention', 'Adequate protein intake is the primary driver of muscle protein synthesis and retention during a caloric deficit.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5421125/', 'peer_reviewed'),
  (3,  'weight_loss_muscle_retention', 'Vitamin B6 is a cofactor in amino acid metabolism and transamination reactions essential for muscle protein utilisation. Adequacy supports normal metabolism; supplementation beyond sufficiency has no additional effect.', 'https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/', 'government'),
  (1,  'weight_loss_muscle_retention', 'Thiamine (B1) is required for pyruvate dehydrogenase and branched-chain alpha-keto acid dehydrogenase — key steps in carbohydrate and amino acid catabolism during energy restriction.', 'https://ods.od.nih.gov/factsheets/Thiamin-HealthProfessional/', 'government'),
  -- Energy levels
  (1,  'energy_levels', 'Thiamine is essential for ATP production via the citric acid cycle; deficiency leads to fatigue and impaired energy metabolism.', 'https://ods.od.nih.gov/factsheets/Thiamin-HealthProfessional/', 'government'),
  (2,  'energy_levels', 'Riboflavin (B2) is a component of FAD and FMN coenzymes central to the electron transport chain and cellular energy production.', 'https://ods.od.nih.gov/factsheets/Riboflavin-HealthProfessional/', 'government'),
  (9,  'energy_levels', 'Iron is required for haemoglobin synthesis; inadequacy reduces oxygen delivery to tissues, a primary cause of fatigue.', 'https://www.canada.ca/en/health-canada/services/nutrients/iron.html', 'government'),
  -- Bone health
  (10, 'bone_health', 'Calcium is the primary mineral component of bone hydroxyapatite; adequate intake is required for bone density maintenance.', 'https://www.canada.ca/en/health-canada/services/nutrients/calcium.html', 'government'),
  (6,  'bone_health', 'Vitamin D enhances intestinal calcium and phosphorus absorption and is required for bone mineralisation.', 'https://www.canada.ca/en/health-canada/services/nutrients/vitamin-d.html', 'government'),
  (8,  'bone_health', 'Vitamin K2 (menaquinone) activates osteocalcin, a protein required for calcium binding in bone matrix.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4566462/', 'peer_reviewed'),
  -- Immune support
  (4,  'immune_support', 'Vitamin C supports neutrophil function, lymphocyte proliferation, and acts as an antioxidant in immune cells.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5707683/', 'peer_reviewed'),
  (6,  'immune_support', 'Vitamin D modulates innate and adaptive immune responses; deficiency is associated with increased infection susceptibility.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3166406/', 'peer_reviewed'),
  -- Iron deficiency / anemia
  (9,  'iron_deficiency', 'Iron is the functional component of haemoglobin and myoglobin; deficiency is the most common cause of nutritional anaemia.', 'https://www.canada.ca/en/health-canada/services/nutrients/iron.html', 'government'),
  (4,  'iron_deficiency', 'Vitamin C reduces Fe³⁺ to Fe²⁺ in the gut, increasing non-heme iron absorption by up to 3-fold.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2854541/', 'peer_reviewed');

-- Seed: absorption_rules
insert into absorption_rules (nutrient_id, rule_type, compound, effect, rationale, source_url) values
  -- Iron
  (9, 'enhancer', 'Vitamin C (ascorbic acid)', 'Increases non-heme iron absorption up to 3-fold', 'Ascorbic acid reduces ferric (Fe³⁺) to ferrous (Fe²⁺) iron and forms a soluble chelate, preventing precipitation in the alkaline duodenum.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2854541/'),
  (9, 'inhibitor', 'Tannins (tea, coffee)', 'Reduces non-heme iron absorption by 60–90%', 'Tannins form insoluble complexes with iron in the gut lumen, preventing mucosal uptake.', 'https://www.ncbi.nlm.nih.gov/pubmed/3290310'),
  (9, 'inhibitor', 'Phytates (grains, legumes)', 'Reduces non-heme iron absorption by 50–65%', 'Phytic acid binds iron via strong chelation, forming insoluble iron phytate complexes.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4325021/'),
  (9, 'inhibitor', 'Calcium', 'Reduces both heme and non-heme iron absorption', 'Calcium competes with iron for shared mucosal transport; effect is dose-dependent above ~300 mg Ca.', 'https://www.ncbi.nlm.nih.gov/pubmed/7693536'),
  -- Fat-soluble vitamins
  (5, 'enhancer', 'Dietary fat', 'Increases beta-carotene and retinol absorption', 'Fat stimulates bile acid secretion and micelle formation required for absorption of fat-soluble compounds in the small intestine.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3743130/'),
  (6, 'enhancer', 'Dietary fat', 'Increases vitamin D absorption from food', 'Vitamin D is incorporated into mixed micelles formed from bile acids and dietary fat for intestinal absorption.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6566726/'),
  (7, 'enhancer', 'Dietary fat', 'Increases vitamin E absorption', 'Alpha-tocopherol requires micellarisation with bile acids and dietary fat for efficient enterocyte uptake.', 'https://www.ncbi.nlm.nih.gov/pubmed/10799367'),
  (8, 'enhancer', 'Dietary fat', 'Increases vitamin K absorption', 'Phylloquinone is a fat-soluble compound requiring bile-acid micelles for absorption in the jejunum.', 'https://www.ncbi.nlm.nih.gov/pubmed/10648260'),
  -- Calcium
  (10, 'enhancer', 'Vitamin D', 'Increases intestinal calcium absorption by 30–80%', 'Calcitriol (active vitamin D) upregulates calbindin and TRPV6 channel expression in enterocytes, increasing active calcium transport.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4010554/'),
  (10, 'inhibitor', 'Phytates (grains, legumes)', 'Reduces calcium absorption', 'Phytic acid chelates calcium, reducing its bioavailability from plant-based foods.', 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4325021/');

-- Seed: DRI values (Health Canada, adults 19–50, general default)
insert into dri_values (nutrient_id, age_group, sex, rda_or_ai, unit) values
  (1,  '19-50', 'male',   1.2,  'mg'),
  (1,  '19-50', 'female', 1.1,  'mg'),
  (2,  '19-50', 'male',   1.3,  'mg'),
  (2,  '19-50', 'female', 1.1,  'mg'),
  (3,  '19-50', 'male',   1.3,  'mg'),
  (3,  '19-50', 'female', 1.3,  'mg'),
  (4,  '19-50', 'male',   90.0, 'mg'),
  (4,  '19-50', 'female', 75.0, 'mg'),
  (5,  '19-50', 'male',   900.0,'mcg RAE'),
  (5,  '19-50', 'female', 700.0,'mcg RAE'),
  (6,  '19-50', 'all',    600.0,'IU'),
  (7,  '19-50', 'male',   15.0, 'mg'),
  (7,  '19-50', 'female', 15.0, 'mg'),
  (8,  '19-50', 'male',   120.0,'mcg'),
  (8,  '19-50', 'female', 90.0, 'mcg'),
  (9,  '19-50', 'male',   8.0,  'mg'),
  (9,  '19-50', 'female', 18.0, 'mg'),
  (10, '19-50', 'all',    1000.0,'mg'),
  (11, '19-50', 'male',   56.0, 'g'),
  (11, '19-50', 'female', 46.0, 'g'),
  (12, '19-50', 'male',   400.0,'mg'),
  (12, '19-50', 'female', 310.0,'mg');
