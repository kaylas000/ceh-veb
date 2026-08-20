/* ------------------------------------------------------------------ */
/* Design Variance Engine — живой «геном-станок» студии.               */
/* Конечный каталог активов × бесконечные комбинации.                  */
/* Ноль зависимостей: seeded-random, HSL-математика, отпечатки.        */
/* ------------------------------------------------------------------ */

/* ---------- каталог активов студии ---------- */

export interface AssetOption {
  id: string;
  name: string;
  mood_tags: string[];
  dimensions: Record<string, string>;
  best_for_industries: string[];
  avoid_for_industries?: string[];
  conflictsWith?: string[];
  note: string;
}

export const ASSET_LIBRARY: Record<string, AssetOption[]> = {
  buttons: [
    { id: "btn-solid-sharp", name: "Solid Sharp", mood_tags: ["дерзкий", "технологичный"], dimensions: { shape: "sharp", fill: "solid", interaction: "offset-shadow" }, best_for_industries: ["индустрия", "строительство"], note: "жёсткая тень-смещение на hover" },
    { id: "btn-outline-round", name: "Outline Round", mood_tags: ["дружелюбный", "игривый"], dimensions: { shape: "round", fill: "transparent", interaction: "fill-grow" }, best_for_industries: ["образование", "сервис"], note: "обводка заполняется на hover" },
    { id: "btn-ghost-underline", name: "Ghost Underline", mood_tags: ["минималистичный", "премиальный"], dimensions: { shape: "underline", fill: "transparent", interaction: "line-grow" }, best_for_industries: ["мода", "архитектура", "издательство"], note: "линия растёт под текстом" },
    { id: "btn-brutal-block", name: "Brutal Block", mood_tags: ["дерзкий"], dimensions: { shape: "sharp", fill: "solid", interaction: "press-down" }, best_for_industries: ["медиа", "ивенты"], avoid_for_industries: ["финансы"], note: "плита, вдавливается при нажатии" },
    { id: "btn-soft-pill", name: "Soft Pill", mood_tags: ["спокойный", "дружелюбный"], dimensions: { shape: "round", fill: "solid", interaction: "lift" }, best_for_industries: ["здоровье", "wellness"], note: "мягкий подъём с тенью" },
    { id: "btn-ticket-notch", name: "Ticket Notch", mood_tags: ["игривый", "дерзкий"], dimensions: { shape: "notch", fill: "solid", interaction: "tear" }, best_for_industries: ["ивенты", "кино"], note: "билет с насечками" },
  ],
  grids: [
    { id: "grid-classic-12", name: "Classic 12-col", mood_tags: ["традиционный"], dimensions: { columns: "12", symmetry: "symmetric", density: "medium" }, best_for_industries: ["корпоративный"], note: "классическая модульная сетка" },
    { id: "grid-asym-editorial", name: "Asymmetric Editorial", mood_tags: ["минималистичный", "премиальный"], dimensions: { columns: "12", symmetry: "asymmetric", density: "low" }, best_for_industries: ["мода", "издательство"], note: "ломаная редакторская сетка" },
    { id: "grid-odd-7", name: "Odd 7-col", mood_tags: ["дерзкий", "технологичный"], dimensions: { columns: "7", symmetry: "asymmetric", density: "high" }, best_for_industries: ["медиа", "стартапы"], note: "нечётные колонки — нестандартный ритм" },
    { id: "grid-split-2-1", name: "Split 2:1", mood_tags: ["современный"], dimensions: { columns: "9", symmetry: "asymmetric", density: "medium" }, best_for_industries: ["saas", "сервис"], note: "широкая + узкая колонка" },
  ],
  iconSets: [
    { id: "ico-outline-thin", name: "Outline Thin", mood_tags: ["минималистичный", "премиальный"], dimensions: { weight: "light", style: "outline" }, best_for_industries: ["финансы", "мода"], note: "волосная линия 1px" },
    { id: "ico-duotone-warm", name: "Duotone Warm", mood_tags: ["дружелюбный", "игривый"], dimensions: { weight: "medium", style: "duotone" }, best_for_industries: ["образование", "сервис"], note: "два тона, тёплые" },
    { id: "ico-geometric-fill", name: "Geometric Fill", mood_tags: ["технологичный", "современный"], dimensions: { weight: "bold", style: "fill" }, best_for_industries: ["стартапы", "saas"], note: "заполненная геометрия" },
    { id: "ico-handdrawn", name: "Handdrawn", mood_tags: ["дружелюбный", "игривый"], dimensions: { weight: "medium", style: "sketch" }, best_for_industries: ["кафе", "детские"], note: "рисованные от руки" },
    { id: "ico-industrial-stencil", name: "Industrial Stencil", mood_tags: ["дерзкий", "традиционный"], dimensions: { weight: "bold", style: "stencil" }, best_for_industries: ["индустрия", "строительство"], note: "трафаретные, как на цехе" },
  ],
  illustrationStyles: [
    { id: "ill-geometric-flat", name: "Geometric Flat", mood_tags: ["современный", "технологичный"], dimensions: { technique: "flat", complexity: "low" }, best_for_industries: ["saas", "стартапы"], note: "плоская геометрия" },
    { id: "ill-organic-handdrawn", name: "Organic Handdrawn", mood_tags: ["дружелюбный", "спокойный"], dimensions: { technique: "handdrawn", complexity: "medium" }, best_for_industries: ["wellness", "кафе"], note: "живые органичные формы" },
    { id: "ill-isometric", name: "Isometric 3D", mood_tags: ["технологичный"], dimensions: { technique: "isometric", complexity: "high" }, best_for_industries: ["стартапы", "логистика"], note: "изометрические сцены" },
    { id: "ill-collage-mixed", name: "Collage Mixed", mood_tags: ["дерзкий", "игривый"], dimensions: { technique: "collage", complexity: "high" }, best_for_industries: ["медиа", "мода"], note: "фото + графика, коллаж" },
    { id: "ill-line-engraving", name: "Line Engraving", mood_tags: ["традиционный", "премиальный"], dimensions: { technique: "line", complexity: "medium" }, best_for_industries: ["издательство", "финансы"], note: "гравюрная штриховка" },
  ],
  animationPresets: [
    { id: "anim-spring-bounce", name: "Spring Bounce", mood_tags: ["игривый", "дружелюбный"], dimensions: { personality: "bouncy", intensity: "high" }, best_for_industries: ["кафе", "детские"], note: "пружинный отскок" },
    { id: "anim-smooth-fade", name: "Smooth Fade", mood_tags: ["спокойный", "премиальный"], dimensions: { personality: "calm", intensity: "low" }, best_for_industries: ["wellness", "финансы"], note: "мягкое растворение" },
    { id: "anim-precise-snap", name: "Precise Snap", mood_tags: ["технологичный", "современный"], dimensions: { personality: "precise", intensity: "medium" }, best_for_industries: ["saas", "стартапы"], note: "точный щелчок" },
    { id: "anim-heavy-drag", name: "Heavy Drag", mood_tags: ["дерзкий"], dimensions: { personality: "heavy", intensity: "high" }, best_for_industries: ["медиа", "ивенты"], note: "тяжёлый ход с инерцией" },
  ],
};

export const CATEGORY_LABEL: Record<string, string> = {
  buttons: "Кнопки",
  grids: "Сетки",
  iconSets: "Иконки",
  illustrationStyles: "Иллюстрации",
  animationPresets: "Анимации",
};

/* ---------- mood → вектор дизайна ---------- */

export const MOOD_DICTIONARY: Record<string, Record<string, number | string>> = {
  современный: { colorTemperature: 0.6, contrast: 0.7, whitespace: 0.7, animationIntensity: 0.6, geometryStyle: "sharp" },
  дорогой: { colorSaturation: -0.3, whitespace: 0.9, contrast: 0.5, animationIntensity: 0.3, geometryStyle: "sharp" },
  дружелюбный: { colorSaturation: 0.5, animationIntensity: 0.7, geometryStyle: "round" },
  технологичный: { colorTemperature: 0.3, contrast: 0.7, animationIntensity: 0.5, geometryStyle: "sharp" },
  традиционный: { colorSaturation: -0.2, contrast: 0.4, animationIntensity: 0.2, geometryStyle: "round" },
  дерзкий: { contrast: 0.9, colorSaturation: 0.8, animationIntensity: 0.9, geometryStyle: "sharp" },
  спокойный: { colorSaturation: -0.4, whitespace: 0.8, contrast: 0.3, animationIntensity: 0.2, geometryStyle: "round" },
  игривый: { colorSaturation: 0.7, animationIntensity: 0.8, geometryStyle: "round" },
  минималистичный: { whitespace: 0.95, colorSaturation: -0.5, contrast: 0.4, animationIntensity: 0.1, geometryStyle: "sharp" },
  премиальный: { whitespace: 0.85, colorSaturation: -0.3, contrast: 0.4, animationIntensity: 0.25, geometryStyle: "sharp" },
};

export interface MoodResult {
  foundMoods: string[];
  vector: Record<string, number>;
  categorical: Record<string, string>;
  confidence: "high" | "low";
}

export function mapBriefToMood(brief: string, explicit: string[] = []): MoodResult {
  const found = [...explicit];
  const lower = brief.toLowerCase();
  for (const mood of Object.keys(MOOD_DICTIONARY)) {
    if (lower.includes(mood) && !found.includes(mood)) found.push(mood);
  }
  const vector: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const categorical: Record<string, string[]> = {};
  for (const mood of found) {
    const v = MOOD_DICTIONARY[mood];
    if (!v) continue;
    for (const [k, val] of Object.entries(v)) {
      if (typeof val === "number") {
        vector[k] = (vector[k] ?? 0) + val;
        counts[k] = (counts[k] ?? 0) + 1;
      } else {
        (categorical[k] = categorical[k] ?? []).push(val);
      }
    }
  }
  for (const k of Object.keys(vector)) vector[k] /= counts[k];
  const cat: Record<string, string> = {};
  for (const [k, arr] of Object.entries(categorical)) {
    const freq: Record<string, number> = {};
    arr.forEach((v) => (freq[v] = (freq[v] ?? 0) + 1));
    cat[k] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  }
  return { foundMoods: found, vector, categorical: cat, confidence: found.length >= 2 ? "high" : "low" };
}

/* ---------- seeded random ---------- */

export function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) || 1;
}

export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

/* ---------- цветовые гармонии (защита от AI-диапазона) ---------- */

const HARMONY_ALGOS: Record<string, (base: number) => number[]> = {
  "complementary": (b) => [b, (b + 180) % 360],
  "split-complementary": (b) => [b, (b + 150) % 360, (b + 210) % 360],
  "analogous": (b) => [b, (b + 30) % 360, (b - 30 + 360) % 360],
  "triadic": (b) => [b, (b + 120) % 360, (b + 240) % 360],
  "monochrome-tonal": (b) => [b],
  "tetradic": (b) => [b, (b + 90) % 360, (b + 180) % 360, (b + 270) % 360],
};

/* 220–260° — типичный AI-фиолетово-синий. Запрещён (B-05). */
const AVOID_HUE: Array<[number, number]> = [[220, 260]];

function pickHue(rng: () => number): number {
  for (let i = 0; i < 24; i++) {
    const h = Math.floor(rng() * 360);
    if (!AVOID_HUE.some(([a, b]) => h >= a && h <= b)) return h;
  }
  return Math.floor(rng() * 220);
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to2 = (x: number) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${to2(f(0))}${to2(f(8))}${to2(f(4))}`;
}

export interface ColorSystem {
  harmonyType: string;
  baseHue: number;
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  paper: string;
  ink: string;
}

export function generateColors(vector: Record<string, number>, rng: () => number): ColorSystem {
  const baseHue = pickHue(rng);
  const satBase = vector.colorSaturation ?? 0;
  const contrast = vector.contrast ?? 0.6;
  const sat = Math.max(20, Math.min(88, 55 + satBase * 35 + (rng() - 0.5) * 10));
  const types = Object.keys(HARMONY_ALGOS);
  const harmonyType =
    contrast > 0.7 ? (rng() > 0.5 ? "complementary" : "triadic")
    : satBase < -0.3 ? "monochrome-tonal"
    : types[Math.floor(rng() * types.length)];
  const hues = HARMONY_ALGOS[harmonyType](baseHue);
  const primary = hslToHex(hues[0], sat, contrast > 0.7 ? 46 : 50);
  const secondary = hslToHex(hues[1] ?? hues[0], sat * 0.8, 42);
  const accent = hslToHex(hues[hues.length - 1] ?? (hues[0] + 40) % 360, Math.min(95, sat + 12), 55);
  const neutral = hslToHex(baseHue, 4 + rng() * 4, 50);
  const paper = hslToHex(baseHue, 6, 92);
  const ink = hslToHex(baseHue, 14, 10);
  return { harmonyType, baseHue, primary, secondary, accent, neutral, paper, ink };
}

/* ---------- геном ---------- */

export interface Genome {
  projectId: string;
  seed: number;
  generatedAt: string;
  moods: string[];
  button: AssetOption;
  grid: AssetOption;
  iconSet: AssetOption;
  illustration: AssetOption;
  animation: AssetOption;
  colors: ColorSystem;
  sectionOrder: string[];
  radius: string;
  uniqueness: UniquenessReport;
}

function fitScore(opt: AssetOption, moods: string[], industry: string[]): number {
  let score = 1;
  score += opt.mood_tags.filter((t) => moods.includes(t)).length * 0.6;
  if (industry.length) {
    score += industry.filter((t) => opt.best_for_industries.includes(t)).length * 0.5;
    score -= industry.filter((t) => opt.avoid_for_industries?.includes(t)).length * 0.8;
  }
  return Math.max(0.1, score);
}

function pickWeighted(pool: AssetOption[], moods: string[], industry: string[], rng: () => number, exclude: string[]): AssetOption {
  const opts = pool.filter((o) => !exclude.includes(o.id));
  const scored = opts.map((o) => ({ o, s: fitScore(o, moods, industry) })).sort((a, b) => b.s - a.s);
  const top = scored.slice(0, Math.min(4, scored.length));
  const total = top.reduce((sum, c) => sum + c.s, 0);
  let r = rng() * total;
  for (const c of top) {
    r -= c.s;
    if (r <= 0) return c.o;
  }
  return top[0].o;
}

/* ---------- уникальность (отпечаток против истории) ---------- */

export interface UniquenessReport {
  conflictLevel: "none" | "moderate" | "high";
  matches: Array<{ projectId: string; count: number }>;
}

const REGISTRY_KEY = "ceh-genome-registry";

export function loadRegistry(): Array<{ projectId: string; fingerprint: string[] }> {
  try {
    return JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function fingerprintOf(g: Pick<Genome, "button" | "iconSet" | "illustration" | "colors">): string[] {
  return [g.button.id, g.iconSet.id, g.illustration.id, g.colors.harmonyType];
}

export function checkUniqueness(g: Pick<Genome, "button" | "iconSet" | "illustration" | "colors">, registry: Array<{ projectId: string; fingerprint: string[] }>, selfId?: string): UniquenessReport {
  const fp = fingerprintOf(g);
  const matches: Array<{ projectId: string; count: number }> = [];
  for (const entry of registry) {
    if (entry.projectId === selfId) continue;
    const count = fp.filter((v) => entry.fingerprint.includes(v)).length;
    if (count >= 2) matches.push({ projectId: entry.projectId, count });
  }
  const high = matches.some((m) => m.count >= 4);
  return { conflictLevel: high ? "high" : matches.length ? "moderate" : "none", matches };
}

export function registerGenome(g: Genome): void {
  const registry = loadRegistry();
  const fp = fingerprintOf(g);
  const next = [...registry.filter((e) => e.projectId !== g.projectId), { projectId: g.projectId, fingerprint: fp }];
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(next));
  } catch {
    /* приватный режим */
  }
}

/* ---------- главный генератор ---------- */

export function generateGenome(projectId: string, moods: string[], industry: string[], exclude: string[] = []): Genome {
  const seed = hashSeed(projectId);
  const rng = seededRandom(seed);
  const mood = mapBriefToMood("", moods);
  const colors = generateColors(mood.vector, rng);
  const geometry = mood.categorical.geometryStyle ?? "sharp";
  const sectionOrder =
    geometry === "sharp" && rng() > 0.5
      ? ["hero", "testimonials", "features", "cta"]
      : ["hero", "features", "testimonials", "cta"];
  const button = pickWeighted(ASSET_LIBRARY.buttons, moods, industry, rng, exclude);
  const genome: Genome = {
    projectId,
    seed,
    generatedAt: new Date().toISOString(),
    moods,
    button,
    grid: pickWeighted(ASSET_LIBRARY.grids, moods, industry, rng, exclude),
    iconSet: pickWeighted(ASSET_LIBRARY.iconSets, moods, industry, rng, exclude),
    illustration: pickWeighted(ASSET_LIBRARY.illustrationStyles, moods, industry, rng, exclude),
    animation: pickWeighted(ASSET_LIBRARY.animationPresets, moods, industry, rng, exclude),
    colors,
    sectionOrder,
    radius: geometry === "round" ? "999px" : geometry === "sharp" ? "0px" : "10px",
    uniqueness: { conflictLevel: "none", matches: [] },
  };
  genome.uniqueness = checkUniqueness(genome, loadRegistry(), projectId);
  return genome;
}

/* авто-диверсификация: до 5 попыток, исключаем конфликтные элементы */
export function generateUniqueGenome(projectId: string, moods: string[], industry: string[]): Genome {
  let exclude: string[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const g = generateGenome(attempt === 0 ? projectId : `${projectId}·${attempt + 1}`, moods, industry, exclude);
    if (g.uniqueness.conflictLevel !== "high") {
      g.projectId = projectId;
      return g;
    }
    exclude = [...exclude, g.button.id];
  }
  return generateGenome(projectId, moods, industry, exclude);
}

/* ---------- комбинаторика ---------- */

export function calculateCombinatorics(): number {
  let total = 1;
  for (const pool of Object.values(ASSET_LIBRARY)) total *= pool.length;
  return total * Object.keys(HARMONY_ALGOS).length;
}
