/* ------------------------------------------------------------------ */
/* SEO-by-Default — браузерные порты анализаторов студии.              */
/* Чистый TS, ноль зависимостей (без compromise.js — своя эвристика).  */
/* ------------------------------------------------------------------ */

/* ---------- типы манифеста (seo-checklist.schema.json) ---------- */

export interface SEOManifest {
  url_slug: string;
  title: string;
  meta_description: string;
  h1: string;
  primary_keyword: string;
  secondary_keywords: string[];
  content_type: string;
  structured_data_type: string[];
  og_image: string;
  internal_links_planned: string[];
  target_word_count?: number;
}

export interface ManifestIssue {
  kind: "error" | "warning";
  code: string;
  message: string;
}

/* ---------- SLUG: транслит + kebab-case ---------- */

const RU_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => (RU_MAP[ch] !== undefined ? RU_MAP[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/* ---------- MODULE 9: MetaTagValidator ---------- */

export function validateSEOManifest(m: SEOManifest): {
  isValid: boolean;
  issues: ManifestIssue[];
} {
  const issues: ManifestIssue[] = [];
  const err = (code: string, message: string) => issues.push({ kind: "error", code, message });
  const warn = (code: string, message: string) => issues.push({ kind: "warning", code, message });

  /* Title 30–60 */
  if (!m.title) err("SEO-TITLE", "Title отсутствует");
  else if (m.title.length < 30 || m.title.length > 60)
    err("SEO-TITLE", `Title: ${m.title.length} символов — нужно 30–60`);

  /* Description 120–158 */
  if (!m.meta_description) err("SEO-DESC", "Meta description отсутствует");
  else if (m.meta_description.length < 120 || m.meta_description.length > 158)
    err("SEO-DESC", `Description: ${m.meta_description.length} символов — нужно 120–158`);

  /* H1 ≠ Title */
  if (
    m.h1 &&
    m.title &&
    m.h1.toLowerCase().trim() === m.title.toLowerCase().trim()
  )
    warn("SEO-H1", "H1 дословно дублирует Title — разнообразьте формулировку");
  if (m.h1 && (m.h1.length < 10 || m.h1.length > 70))
    err("SEO-H1", `H1: ${m.h1.length} символов — нужно 10–70`);

  /* slug */
  if (!m.url_slug) err("SEO-SLUG", "URL slug отсутствует");
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.url_slug))
    err("SEO-SLUG", "Slug содержит недопустимые символы (только a-z, 0-9, дефисы)");

  /* keyword */
  if (!m.primary_keyword || m.primary_keyword.trim().length < 2)
    err("SEO-KW", "Primary keyword не указан");
  else if (m.title && !m.title.toLowerCase().includes(m.primary_keyword.toLowerCase()))
    warn("SEO-KW", `Primary keyword «${m.primary_keyword}» отсутствует в Title`);

  /* structured data */
  if (!m.structured_data_type || m.structured_data_type.length === 0)
    err("SEO-SCHEMA", "Не указан тип Schema.org-разметки");

  /* internal links */
  if (!m.internal_links_planned || m.internal_links_planned.length < 2)
    warn("SEO-LINKS", "Менее 2 внутренних ссылок — риск orphan-страницы");

  /* og image */
  if (!m.og_image) err("SEO-OG", "OG Image отсутствует — соцсети не покажут превью");

  return { isValid: issues.every((i) => i.kind !== "error"), issues };
}

/* ---------- MODULE 8: ContentSEOAnalyzer ---------- */

export interface ContentIssue {
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
}

export interface ContentResult {
  wordCount: number;
  density: number;
  readability: number;
  score: number;
  issues: ContentIssue[];
}

const RU_VOWELS = /[аеёиоуыэюя]/gi;

function countSyllables(word: string): number {
  const m = word.match(RU_VOWELS);
  return m ? m.length : 1;
}

function keywordDensity(text: string, keyword: string): number {
  const words = text.trim().split(/\s+/).length || 1;
  const kwWords = keyword.trim().split(/\s+/).length || 1;
  const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = (text.match(new RegExp(esc, "gi")) || []).length;
  return ((matches * kwWords) / words) * 100;
}

function readabilityScore(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!sentences.length || !words.length) return 0;
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  const aps = words.length / sentences.length;
  const spw = syllables / words.length;
  return Math.max(0, Math.min(100, 206.835 - 1.3 * aps - 60.1 * spw));
}

export function analyzeContent(
  content: string,
  primaryKeyword: string,
  secondaryKeywords: string[] = [],
): ContentResult {
  const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plain ? plain.split(" ").length : 0;
  const issues: ContentIssue[] = [];
  let score = 100;

  if (wordCount < 300) {
    issues.push({
      type: "THIN_CONTENT",
      severity: "high",
      message: `Контент слишком короткий (${wordCount} слов). Минимум 300, для конкурентных запросов 800+.`,
    });
    score -= 25;
  }

  const density = primaryKeyword ? keywordDensity(plain, primaryKeyword) : 0;
  if (!primaryKeyword) {
    issues.push({ type: "NO_KEYWORD", severity: "critical", message: "Primary keyword не задан" });
    score -= 30;
  } else if (density === 0) {
    issues.push({
      type: "MISSING_KEYWORD",
      severity: "critical",
      message: `Главный keyword «${primaryKeyword}» не найден в тексте.`,
    });
    score -= 30;
  } else if (density > 3) {
    issues.push({
      type: "KEYWORD_STUFFING",
      severity: "high",
      message: `Переспам «${primaryKeyword}»: ${density.toFixed(1)}% (норма 1–2%).`,
    });
    score -= 20;
  } else if (density < 0.5) {
    issues.push({
      type: "LOW_DENSITY",
      severity: "medium",
      message: `Низкая плотность «${primaryKeyword}»: ${density.toFixed(1)}%.`,
    });
    score -= 10;
  }

  /* keyword в первых ~100 словах */
  if (primaryKeyword) {
    const intro = plain.split(" ").slice(0, 100).join(" ").toLowerCase();
    if (wordCount >= 100 && !intro.includes(primaryKeyword.toLowerCase())) {
      issues.push({
        type: "KW_NOT_IN_INTRO",
        severity: "medium",
        message: "Keyword отсутствует в первых 100 словах — важно для релевантности.",
      });
      score -= 10;
    }
  }

  for (const kw of secondaryKeywords) {
    if (kw && !plain.toLowerCase().includes(kw.toLowerCase())) {
      issues.push({
        type: "MISSING_SECONDARY",
        severity: "low",
        message: `Дополнительный keyword «${kw}» не используется.`,
      });
      score -= 3;
    }
  }

  const readability = readabilityScore(plain);
  if (readability < 40 && wordCount > 0) {
    issues.push({
      type: "LOW_READABILITY",
      severity: "medium",
      message: `Текст сложен для восприятия (индекс ${readability.toFixed(0)}). Упростите предложения.`,
    });
    score -= 10;
  }

  const h2Count = (content.match(/<h2/gi) || []).length;
  if (wordCount > 500 && h2Count === 0) {
    issues.push({
      type: "NO_SUBHEADINGS",
      severity: "medium",
      message: `Длинный текст (${wordCount} слов) без H2 — плохо для сканируемости.`,
    });
    score -= 10;
  }

  return { wordCount, density, readability, score: Math.max(0, score), issues };
}

/* ---------- MODULE 7: Structured data generators ---------- */

export function articleSchema(d: {
  headline: string;
  description: string;
  image: string;
  authorName: string;
  publisherName: string;
  publisherLogo: string;
  datePublished: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: d.headline,
    description: d.description,
    image: [d.image],
    author: { "@type": "Person", name: d.authorName },
    publisher: {
      "@type": "Organization",
      name: d.publisherName,
      logo: { "@type": "ImageObject", url: d.publisherLogo },
    },
    datePublished: d.datePublished,
    dateModified: d.datePublished,
    mainEntityOfPage: { "@type": "WebPage", "@id": d.url },
  };
}

export function localBusinessSchema(d: {
  name: string;
  description: string;
  telephone: string;
  street: string;
  city: string;
  region: string;
  url: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: d.name,
    description: d.description,
    telephone: d.telephone,
    url: d.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: d.street,
      addressLocality: d.city,
      addressRegion: d.region,
      addressCountry: "RU",
    },
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ label: string; url: string }>, baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: `${baseUrl}${it.url}`,
    })),
  };
}

export const SCHEMA_BY_TYPE: Record<string, string> = {
  article: "Article + BreadcrumbList + Author",
  product: "Product + Offer + AggregateRating",
  landing: "Organization + WebSite",
  "local-business": "LocalBusiness + PostalAddress",
  faq: "FAQPage",
  category: "CollectionPage + BreadcrumbList",
};

/* ---------- MODULE 12: SEOScoreAggregator ---------- */

export interface AuditInput {
  manifest: SEOManifest;
  content: string;
  hasStructuredData: boolean;
  imagesWithoutAlt: number;
  internalLinksCount: number;
}

export interface AuditCheck {
  key: string;
  label: string;
  score: number;
  detail: string;
}

export interface AuditResult {
  checks: AuditCheck[];
  overall: number;
  verdict: { emoji: string; text: string };
  critical: string[];
}

const WEIGHTS: Record<string, number> = {
  metaTags: 0.3,
  content: 0.3,
  structuredData: 0.2,
  images: 0.1,
  internalLinks: 0.1,
};

export function auditPage(input: AuditInput): AuditResult {
  const manifest = validateSEOManifest(input.manifest);
  const content = analyzeContent(
    input.content,
    input.manifest.primary_keyword,
    input.manifest.secondary_keywords,
  );

  const metaScore = manifest.isValid
    ? 100 - manifest.issues.filter((i) => i.kind === "warning").length * 10
    : Math.max(0, 100 - manifest.issues.filter((i) => i.kind === "error").length * 20);

  const checks: AuditCheck[] = [
    {
      key: "metaTags",
      label: "Мета-теги",
      score: Math.max(0, metaScore),
      detail: `${manifest.issues.filter((i) => i.kind === "error").length} ошибок · ${
        manifest.issues.filter((i) => i.kind === "warning").length
      } предупреждений`,
    },
    {
      key: "content",
      label: "Контент",
      score: content.score,
      detail: `${content.wordCount} слов · плотность ${content.density.toFixed(1)}% · читаемость ${content.readability.toFixed(0)}`,
    },
    {
      key: "structuredData",
      label: "Schema.org",
      score: input.hasStructuredData ? 100 : 0,
      detail: input.hasStructuredData ? "JSON-LD присутствует" : "разметка отсутствует",
    },
    {
      key: "images",
      label: "Изображения",
      score:
        input.imagesWithoutAlt === 0 ? 100 : Math.max(0, 100 - input.imagesWithoutAlt * 15),
      detail: input.imagesWithoutAlt === 0 ? "все alt на месте" : `без alt: ${input.imagesWithoutAlt}`,
    },
    {
      key: "internalLinks",
      label: "Перелинковка",
      score: input.internalLinksCount >= 2 ? 100 : input.internalLinksCount * 50,
      detail: `${input.internalLinksCount} внутренних ссылок`,
    },
  ];

  const overall = Math.round(
    checks.reduce((sum, c) => sum + c.score * (WEIGHTS[c.key] ?? 0.2), 0),
  );

  const critical: string[] = [
    ...manifest.issues.filter((i) => i.kind === "error").map((i) => i.message),
    ...content.issues.filter((i) => i.severity === "critical").map((i) => i.message),
  ];
  if (!input.hasStructuredData) critical.push("Отсутствует Schema.org разметка");

  const verdict =
    critical.length > 0
      ? { emoji: "BLOCK", text: "Критичные SEO-ошибки — деплой заблокирован" }
      : overall >= 90
        ? { emoji: "95+", text: "Отличная SEO-оптимизация" }
        : overall >= 75
          ? { emoji: "OK", text: "Хорошо" }
          : overall >= 60
            ? { emoji: "WARN", text: "Требуется доработка" }
            : { emoji: "FAIL", text: "Серьёзные проблемы, ревизия обязательна" };

  return { checks, overall, verdict, critical };
}
