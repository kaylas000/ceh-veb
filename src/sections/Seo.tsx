import { useMemo, useState } from "react";
import {
  generateSlug,
  validateSEOManifest,
  analyzeContent,
  auditPage,
  articleSchema,
  localBusinessSchema,
  faqSchema,
  breadcrumbSchema,
  SCHEMA_BY_TYPE,
  type SEOManifest,
} from "../lib/seo";
import { Reveal, useInView, useCountUp } from "../lib/fx";
import { ScrollWindow } from "../components/ScrollWindow";
import { SectionHead } from "./Chrome";
import { buildSeoFiles, downloadSeoZip } from "../lib/studio";

/* ---------- 10 правил агента ---------- */

const RULES = [
  ["П0", "Заполни page_seo_manifest ДО кода. Нет данных — оставь SEO-TODO, не молчи."],
  ["П1", "Title 50–60 симв., description 120–158 с CTA. Title ≠ H1 дословно."],
  ["П2", "Ровно один H1. Иерархия H1→H2→H3 без пропусков. Заголовки — не для стилизации."],
  ["П3", "Каждый img — alt + width/height. Ниже fold — lazy, hero — eager + high."],
  ["П4", "Семантика: header/nav/main/article/section/footer, а не div-суп."],
  ["П5", "JSON-LD обязателен по типу страницы (Article/Product/LocalBusiness/FAQ…)."],
  ["П6", "URL: kebab-case, латиница, ≤4 сегментов, slug содержит keyword."],
  ["П7", "≥2–3 контекстных внутренних ссылок, описательный анкор, без orphan."],
  ["П8", "Performance = SEO: font-display:swap, бюджет JS ≤300KB, SSR для индекса."],
  ["П9", "Mobile-first: весь SEO-контент на мобильном, никогда не display:none."],
  ["П10", "lang=ru обязателен; мультиязычность — hreflang со self-reference."],
];

/* ---------- длина-метр с зонами ---------- */

function LenMeter({
  label,
  value,
  min,
  max,
  hard,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  hard: number;
}) {
  const len = value.length;
  const inZone = len >= min && len <= max;
  const near = !inZone && len >= min - 8 && len <= max + 8;
  const color = inZone ? "text-green" : near ? "text-yellow" : "text-red";
  const barColor = inZone ? "bg-green" : near ? "bg-yellow" : "bg-red";
  const pct = Math.min(100, (len / hard) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">{label}</span>
        <span className={`font-mono text-[11px] font-bold tabular-nums ${color}`}>
          {len} <span className="text-paper/35">/ {min}–{max}</span>
        </span>
      </div>
      <div className="relative mt-1 h-1.5 w-full bg-paper/10">
        {/* допустимая зона */}
        <div
          className="absolute inset-y-0 bg-paper/15"
          style={{ left: `${(min / hard) * 100}%`, width: `${((max - min) / hard) * 100}%` }}
        />
        <div className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-200`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- скоринг-гейдж ---------- */

function Gauge({ score, verdict }: { score: number; verdict: { emoji: string; text: string } }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const shown = useCountUp(score, inView, 900);
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 90 ? "var(--color-green)" : score >= 75 ? "var(--color-yellow)" : "var(--color-red)";
  return (
    <div ref={ref} className="flex items-center gap-5">
      <div className="relative h-[128px] w-[128px] shrink-0">
        <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-paper)" strokeOpacity="0.12" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * shown) / 100}
            className="transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl leading-none text-paper tabular-nums">{shown}</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-paper/40">/ 100</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={`inline-block border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
            verdict.emoji === "BLOCK" || verdict.emoji === "FAIL"
              ? "border-red text-red"
              : verdict.emoji === "WARN"
                ? "border-yellow text-yellow"
                : "border-green text-green"
          }`}
        >
          {verdict.emoji}
        </span>
        <p className="mt-2 text-[13px] leading-snug text-paper/75">{verdict.text}</p>
      </div>
    </div>
  );
}

/* ---------- строка чека ---------- */

function CheckRow({ label, score, detail }: { label: string; score: number; detail: string }) {
  const color = score >= 90 ? "bg-green" : score >= 60 ? "bg-yellow" : "bg-red";
  const text = score >= 90 ? "text-green" : score >= 60 ? "text-yellow" : "text-red";
  return (
    <div className="border-b border-line-dark/60 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-paper/70">{label}</span>
        <span className={`font-mono text-[11px] font-bold tabular-nums ${text}`}>{score}</span>
      </div>
      <div className="mt-1.5 h-1 w-full bg-paper/10">
        <div className={`h-full ${color} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] text-paper/40">{detail}</p>
    </div>
  );
}

/* ---------- сама секция ---------- */

export function Seo() {
  const [title, setTitle] = useState("Порошковая покраска металла в Красногорске — цех Pcpolimer");
  const [desc, setDesc] = useState(
    "Порошковая покраска металла в любой цвет RAL: печь 200 °C, слой 60–120 мкм, ежедневно до 21:00. Расчёт по фото детали — в день обращения.",
  );
  const [h1, setH1] = useState("Порошковая покраска металла в любой цвет RAL");
  const [kw, setKw] = useState("порошковая покраска");
  const [kw2, setKw2] = useState("покраска металла, ral");
  const [ctype, setCtype] = useState("local-business");
  const [og, setOg] = useState("/og/pcpolimer-1200x630.webp");
  const [links, setLinks] = useState("/uslugi, /cveta-ral, /kontakty");
  const [content, setContent] = useState(
    "<h2>Что такое порошковая покраска</h2><p>Порошковая покраска — это нанесение сухого мелкодисперсного порошка на металл с последующей полимеризацией в печи при 200 °C. Покрытие стойко к коррозии, влаге и реагентам, не выцветает и не трескается. Порошковая покраска металла — самое долговечное покрытие для заборов, ворот, фасадов и автодеталей.</p><h2>Почему цех, а не гараж</h2><p>Камера полимеризации держит 200 °C по всей площади, поэтому краска спекается равномерно. Слой 60–120 мкм контролируется толщиномером на каждой детали. Порошковая покраска в цехе Pcpolimer — это гарантия на покрытие и чистый цвет из палитры RAL без разнотона.</p>",
  );

  const manifest = useMemo<SEOManifest>(
    () => ({
      url_slug: generateSlug(kw),
      title,
      meta_description: desc,
      h1,
      primary_keyword: kw,
      secondary_keywords: kw2.split(",").map((s) => s.trim()).filter(Boolean),
      content_type: ctype,
      structured_data_type: ctype ? [ctype === "landing" ? "Organization" : SCHEMA_BY_TYPE[ctype]?.split(" + ")[0] ?? "Article"] : [],
      og_image: og,
      internal_links_planned: links.split(",").map((s) => s.trim()).filter(Boolean),
    }),
    [title, desc, h1, kw, kw2, ctype, og, links],
  );

  const manifestCheck = useMemo(() => validateSEOManifest(manifest), [manifest]);
  const contentCheck = useMemo(
    () => analyzeContent(content, manifest.primary_keyword, manifest.secondary_keywords),
    [content, manifest.primary_keyword, manifest.secondary_keywords],
  );

  const audit = useMemo(
    () =>
      auditPage({
        manifest,
        content,
        hasStructuredData: !!ctype,
        imagesWithoutAlt: 0,
        internalLinksCount: manifest.internal_links_planned.length,
      }),
    [manifest, content, ctype],
  );

  const jsonLd = useMemo(() => {
    const url = `https://pcpolimer.ru/${manifest.url_slug}`;
    const date = new Date().toISOString().split("T")[0];
    switch (ctype) {
      case "article":
        return articleSchema({
          headline: h1, description: desc.slice(0, 158), image: og,
          authorName: "Цех Pcpolimer", publisherName: "Pcpolimer", publisherLogo: "/logo.png",
          datePublished: date, url,
        });
      case "local-business":
        return localBusinessSchema({
          name: "Порошковая покраска Pcpolimer", description: desc.slice(0, 158),
          telephone: "+7 (925) 333-86-66", street: "Речная улица, 8",
          city: "Красногорск", region: "Московская область", url: "https://pcpolimer.ru/",
        });
      case "faq":
        return faqSchema([
          { question: "Сколько сохнет порошковая покраска?", answer: "Полимеризация в печи занимает 15–20 минут при 200 °C, остывание — около часа." },
          { question: "Какие цвета доступны?", answer: "Вся палитра RAL — более 200 оттенков, включая металлики и муар." },
        ]);
      default:
        return breadcrumbSchema(
          [
            { label: "Главная", url: "/" },
            { label: h1, url: `/${manifest.url_slug}` },
          ],
          "https://pcpolimer.ru",
        );
    }
  }, [ctype, h1, desc, og, manifest.url_slug]);

  const seoCount = useMemo(() => buildSeoFiles().length, []);

  const input =
    "w-full border border-line-dark bg-ink-3 px-3 py-2.5 font-mono text-[12px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none transition-colors";

  return (
    <section id="seo" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="12"
          kicker="seo-by-default"
          lines={[<>SEO вшивается,</>, <span key="s" className="text-paper/50">а не докручивается</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                Страницу физически нельзя собрать без манифеста: валидатор режет деплой, пока
                title, description, schema и перелинковка не на месте. Верстак ниже — живой.
              </p>
            </Reveal>
          }
        />

        {/* ---------- верстак ---------- */}
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* левая колонка: манифест */}
          <Reveal>
            <div className="flex h-full flex-col border-2 border-line-dark bg-ink-2">
              <div className="flex items-center justify-between border-b-2 border-line-dark px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">page_seo_manifest</span>
                <span className={`font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${manifestCheck.isValid ? "text-green" : "text-red"}`}>
                  {manifestCheck.isValid ? "валиден" : "не пройдёт гейт"}
                </span>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title 50–60 символов" className={input} aria-label="Title" />
                  <div className="mt-1.5"><LenMeter label="title" value={title} min={30} max={60} hard={80} /></div>
                </div>

                <div>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="Description 120–158 символов с CTA" className={`${input} resize-none`} aria-label="Meta description" />
                  <div className="mt-1.5"><LenMeter label="description" value={desc} min={120} max={158} hard={190} /></div>
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">h1 <span className="text-paper/30">(≠ title)</span></label>
                  <input value={h1} onChange={(e) => setH1(e.target.value)} className={`${input} mt-1`} aria-label="H1" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">primary keyword</label>
                    <input value={kw} onChange={(e) => setKw(e.target.value)} className={`${input} mt-1`} aria-label="Primary keyword" />
                    <p className="mt-1.5 font-mono text-[10px] text-paper/40">slug: <span className="text-yellow">/{manifest.url_slug || "…"}</span></p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">secondary (через запятую)</label>
                    <input value={kw2} onChange={(e) => setKw2(e.target.value)} className={`${input} mt-1`} aria-label="Secondary keywords" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">content_type → schema</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {["article", "product", "local-business", "faq", "landing"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setCtype(t)}
                          className={`border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                            ctype === t ? "border-yellow bg-yellow text-ink" : "border-line-dark text-paper/50 hover:border-paper/40 hover:text-paper"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-paper/40">{SCHEMA_BY_TYPE[ctype] ?? "—"}</p>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">внутренние ссылки</label>
                    <input value={links} onChange={(e) => setLinks(e.target.value)} className={`${input} mt-1`} aria-label="Internal links" />
                    <p className="mt-1.5 font-mono text-[10px] text-paper/40">
                      {manifest.internal_links_planned.length >= 2 ? (
                        <span className="text-green">{manifest.internal_links_planned.length} — orphan не грозит</span>
                      ) : (
                        <span className="text-red">нужно ≥2</span>
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">og:image (1200×630)</label>
                  <input value={og} onChange={(e) => setOg(e.target.value)} className={`${input} mt-1`} aria-label="OG image" />
                </div>

                {/* issues */}
                {manifestCheck.issues.length > 0 && (
                  <ul className="space-y-1.5 border-t border-line-dark pt-3">
                    {manifestCheck.issues.map((i) => (
                      <li key={i.code + i.message} className="flex gap-2.5 font-mono text-[11px] leading-snug">
                        <span className={`mt-0.5 shrink-0 font-bold ${i.kind === "error" ? "text-red" : "text-yellow"}`}>
                          {i.kind === "error" ? "✕" : "!"} {i.code}
                        </span>
                        <span className="text-paper/65">{i.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>

          {/* правая колонка: скоринг + JSON-LD */}
          <div className="flex flex-col gap-5">
            <Reveal delay={100}>
              <div className="border-2 border-line-dark bg-ink-2 p-4 sm:p-5">
                <Gauge score={audit.overall} verdict={audit.verdict} />
                <div className="mt-4">
                  {audit.checks.map((c) => (
                    <CheckRow key={c.key} label={c.label} score={c.score} detail={c.detail} />
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="flex min-h-0 flex-1 flex-col border-2 border-line-dark bg-ink-2">
                <div className="flex items-center justify-between border-b-2 border-line-dark px-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">application/ld+json</span>
                  <span className="font-mono text-[10px] text-paper/40">{ctype}</span>
                </div>
                <ScrollWindow axis="both" className="max-h-[260px] flex-1" fadeFrom="#1e1d16">
                  <pre className="w-max min-w-full p-4 font-mono text-[11px] leading-relaxed text-green/80">
                    {JSON.stringify(jsonLd, null, 2)}
                  </pre>
                </ScrollWindow>
              </div>
            </Reveal>
          </div>
        </div>

        {/* ---------- контент-анализатор ---------- */}
        <Reveal>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            <div className="border-2 border-line-dark bg-ink-2">
              <div className="flex items-center justify-between border-b-2 border-line-dark px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">контент страницы</span>
                <span className="font-mono text-[10px] text-paper/40">HTML или текст</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                className="w-full resize-none bg-transparent p-4 font-mono text-[12px] leading-relaxed text-paper/85 focus:outline-none"
                aria-label="Контент страницы"
              />
            </div>
            <div className="border-2 border-line-dark bg-ink-2 p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">content seo анализ</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { l: "слов", v: String(contentCheck.wordCount), min: 300 },
                  { l: "плотность", v: `${contentCheck.density.toFixed(1)}%`, ok: contentCheck.density >= 0.5 && contentCheck.density <= 3 },
                  { l: "читаемость", v: contentCheck.readability.toFixed(0), ok: contentCheck.readability >= 40 },
                ].map((m) => (
                  <div key={m.l} className="border border-line-dark bg-ink-3 p-3 text-center">
                    <p className={`font-display text-2xl leading-none tabular-nums ${m.ok === false ? "text-red" : "text-paper"}`}>{m.v}</p>
                    <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-paper/40">{m.l}</p>
                  </div>
                ))}
              </div>
              {contentCheck.issues.length > 0 ? (
                <ul className="mt-4 space-y-1.5 border-t border-line-dark pt-3">
                  {contentCheck.issues.map((i) => (
                    <li key={i.type} className="flex gap-2.5 font-mono text-[11px] leading-snug">
                      <span className={`mt-0.5 shrink-0 font-bold ${i.severity === "critical" ? "text-red" : i.severity === "high" ? "text-red" : i.severity === "medium" ? "text-yellow" : "text-paper/40"}`}>
                        {i.severity === "critical" || i.severity === "high" ? "✕" : "!"}
                      </span>
                      <span className="text-paper/65">{i.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-line-dark pt-3 font-mono text-[11px] text-green">✓ контент прошёл анализ — замечаний нет</p>
              )}
              <p className="mt-4 font-mono text-[10px] leading-relaxed text-paper/40">
                Оценка контента: <span className="font-bold text-paper">{contentCheck.score}/100</span> · вес 30% в общем скоринге
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---------- 10 правил ---------- */}
        <Reveal>
          <div className="mt-5 border-2 border-line-dark bg-ink-2">
            <div className="flex items-center justify-between border-b-2 border-line-dark px-4 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">SEO_AGENT_RULES.md — вшивается в контекст агента</span>
              <span className="hidden font-mono text-[10px] text-paper/40 sm:block">11 правил · hard-stop действия блокируются</span>
            </div>
            <div className="grid gap-x-8 px-4 py-4 sm:px-5 md:grid-cols-2">
              {RULES.map(([code, text]) => (
                <div key={code} className="flex gap-3 border-b border-line-dark/50 py-2.5 last:border-b-0 md:[&:nth-last-child(2)]:border-b-0">
                  <span className="shrink-0 font-display text-sm text-red">{code}</span>
                  <p className="text-[12px] leading-relaxed text-paper/70">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ---------- скачать пакет ---------- */}
        <Reveal>
          <div className="mt-5 flex flex-col items-start justify-between gap-4 border-2 border-yellow bg-yellow/10 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">полный пакет seo-by-default · ceh-seo.zip</p>
              <p className="mt-1.5 text-sm leading-relaxed text-paper/80">
                {seoCount} файлов: ruleset для агента, CLI-генератор страниц, компоненты, генераторы Schema.org,
                анализаторы, ESLint-правила, sitemap/robots, CI-гейт и плейбук.
              </p>
            </div>
            <button
              onClick={() => void downloadSeoZip("ceh-seo.zip")}
              className="shrink-0 border-2 border-yellow bg-yellow px-7 py-4 font-display text-base font-bold uppercase tracking-[0.12em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(224,169,28,0.45)]"
            >
              ↓ Скачать SEO-пакет
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
