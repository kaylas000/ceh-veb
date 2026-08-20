import { useEffect, useRef, useState } from "react";
import { Reveal } from "../lib/fx";
import { SectionHead } from "./Chrome";
import {
  FOLDER_OPTIONS,
  KIND_LABEL,
  destPath,
  fmtSize,
  makeIntakeFile,
  readHead,
  renderSkillMd,
  slugify,
  type IntakeFile,
  type SkillDraft,
} from "../lib/intake";
import { downloadBlobZip, useZipDownload } from "../lib/zip";

/* ---------- конструктор скила ---------- */

const emptySkill = (): SkillDraft => ({
  slug: "",
  name: "",
  when: "",
  rules: ["", "", ""],
  example: "",
  mistakes: [""],
});

function SkillBuilder({
  draft,
  onChange,
  onAdd,
}: {
  draft: SkillDraft;
  onChange: (d: SkillDraft) => void;
  onAdd: () => void;
}) {
  const set = (patch: Partial<SkillDraft>) => onChange({ ...draft, ...patch });
  const setRule = (i: number, v: string) => set({ rules: draft.rules.map((r, j) => (j === i ? v : r)) });
  const setMistake = (i: number, v: string) => set({ mistakes: draft.mistakes.map((m, j) => (j === i ? v : m)) });
  const valid = draft.name.trim() && draft.when.trim() && draft.rules.some((r) => r.trim());

  return (
    <div className="border-2 border-line-dark bg-ink-2 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-yellow">конструктор скила → skills/&lt;slug&gt;/SKILL.md</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">название</span>
          <input
            value={draft.name}
            onChange={(e) => set({ name: e.target.value, slug: slugify(e.target.value) })}
            placeholder="Плакатная типографика"
            className="mt-1 w-full border border-line-dark bg-[#14120c] px-3 py-2 font-mono text-[12px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">slug (латиница)</span>
          <input
            value={draft.slug}
            onChange={(e) => set({ slug: slugify(e.target.value) })}
            placeholder="poster-type"
            className="mt-1 w-full border border-line-dark bg-[#14120c] px-3 py-2 font-mono text-[12px] text-yellow placeholder:text-paper/25 focus:border-yellow focus:outline-none"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">when — когда применять</span>
        <input
          value={draft.when}
          onChange={(e) => set({ when: e.target.value })}
          placeholder="Заголовок работает как изображение, не как текст"
          className="mt-1 w-full border border-line-dark bg-[#14120c] px-3 py-2 font-mono text-[12px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none"
        />
      </label>
      <div className="mt-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">нумерованные правила</span>
        <div className="mt-1 space-y-1.5">
          {draft.rules.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right font-mono text-[11px] font-bold text-red">{i + 1}</span>
              <input
                value={r}
                onChange={(e) => setRule(i, e.target.value)}
                placeholder="Конкретная инструкция, не «сделай красиво»"
                className="w-full border border-line-dark bg-[#14120c] px-3 py-1.5 font-mono text-[11px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => set({ rules: [...draft.rules, ""] })}
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-paper/40 transition-colors hover:text-yellow"
        >
          + правило
        </button>
      </div>
      <label className="mt-3 block">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">пример</span>
        <textarea
          value={draft.example}
          onChange={(e) => set({ example: e.target.value })}
          rows={2}
          placeholder="Как это выглядит в бою"
          className="mt-1 w-full border border-line-dark bg-[#14120c] px-3 py-2 font-mono text-[11px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none"
        />
      </label>
      <div className="mt-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-paper/45">частые ошибки</span>
        {draft.mistakes.map((m, i) => (
          <input
            key={i}
            value={m}
            onChange={(e) => setMistake(i, e.target.value)}
            placeholder="× что идёт не так"
            className="mt-1.5 w-full border border-line-dark bg-[#14120c] px-3 py-1.5 font-mono text-[11px] text-paper placeholder:text-paper/25 focus:border-yellow focus:outline-none"
          />
        ))}
        <button
          onClick={() => set({ mistakes: [...draft.mistakes, ""] })}
          className="mt-2 font-mono text-[10px] uppercase tracking-wider text-paper/40 transition-colors hover:text-yellow"
        >
          + ошибка
        </button>
      </div>
      <button
        onClick={onAdd}
        disabled={!valid}
        className="mt-4 w-full border-2 border-green/60 px-4 py-2.5 font-display text-[12px] font-bold uppercase tracking-[0.12em] text-green transition-all duration-200 hover:bg-green hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-green"
      >
        + Добавить скил в очередь
      </button>
    </div>
  );
}

/* ---------- строка очереди ---------- */

function QueueRow({
  f,
  onFolder,
  onRemove,
}: {
  f: IntakeFile;
  onFolder: (folder: string) => void;
  onRemove: () => void;
}) {
  const [head, setHead] = useState<string | null>(null);
  useEffect(() => {
    if (f.kind === "script" || f.kind === "skill" || f.kind === "recipe") {
      void readHead(f).then(setHead);
    }
  }, [f]);

  return (
    <div className="group border border-line-dark bg-[#14120c] p-3 transition-colors duration-200 hover:border-paper/40">
      <div className="flex items-start gap-3">
        {/* превью */}
        <div className="h-14 w-14 shrink-0 overflow-hidden border border-line-dark bg-ink">
          {f.kind === "image" && f.previewUrl ? (
            <img src={f.previewUrl} alt={f.name} className="h-full w-full object-cover" />
          ) : f.kind === "video" && f.previewUrl ? (
            <video src={f.previewUrl} muted className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center font-mono text-[9px] font-bold uppercase text-paper/40">
              .{f.ext || "?"}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-[12px] font-bold text-paper">{f.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-paper/45">
            {KIND_LABEL[f.kind]} · {fmtSize(f.size)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-wider text-paper/40">→</span>
            <select
              value={f.folder}
              onChange={(e) => onFolder(e.target.value)}
              className="border border-line-dark bg-ink px-2 py-1 font-mono text-[10px] text-yellow focus:border-yellow focus:outline-none"
              title="Целевая папка студии"
            >
              {FOLDER_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}/
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={onRemove}
          aria-label={`Убрать ${f.name} из очереди`}
          className="shrink-0 border border-line-dark px-2 py-1 font-mono text-[11px] text-paper/40 transition-colors hover:border-red hover:text-red"
        >
          ×
        </button>
      </div>
      {head && (
        <pre className="term-scroll mt-2 overflow-x-auto border-t border-line-dark/60 pt-2 font-mono text-[9px] leading-relaxed text-paper/50">
          {head}
        </pre>
      )}
    </div>
  );
}

/* ---------- секция ---------- */

export function Intake() {
  const [files, setFiles] = useState<IntakeFile[]>([]);
  const [skills, setSkills] = useState<SkillDraft[]>([]);
  const [draft, setDraft] = useState<SkillDraft>(emptySkill());
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).map((f) => makeIntakeFile(f));
    setFiles((prev) => [...prev, ...next]);
  };

  const setFolder = (id: string, folder: string) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, folder } : f)));
  const removeFile = (id: string) => {
    setFiles((prev) => {
      const victim = prev.find((f) => f.id === id);
      if (victim?.previewUrl) URL.revokeObjectURL(victim.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };
  const removeSkill = (i: number) => setSkills((prev) => prev.filter((_, j) => j !== i));

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const totalItems = files.length + skills.length;

  const zip = useZipDownload(async () => {
    const entries: Array<{ name: string; data: Uint8Array }> = [];
    const enc = new TextEncoder();
    for (const f of files) {
      const buf = await f.file.arrayBuffer();
      entries.push({ name: destPath(f), data: new Uint8Array(buf) });
    }
    for (const s of skills) {
      const slug = s.slug || slugify(s.name);
      entries.push({ name: `skills/${slug}/SKILL.md`, data: enc.encode(renderSkillMd({ ...s, slug })) });
    }
    /* памятка для куратора */
    const manifest = [
      "# Приёмка в архив ЦЕХ",
      "",
      `Файлов: ${files.length} · Скилов: ${skills.length}`,
      "",
      "## Куда легло",
      ...files.map((f) => `- ${destPath(f)}`),
      ...skills.map((s) => `- skills/${s.slug || slugify(s.name)}/SKILL.md`),
      "",
      "Распакуй в корень репозитория студии — файлы встанут по папкам.",
      "Скриншоты референсов привяжи к <id>.meta.yaml (поле screenshot).",
      "",
    ].join("\n");
    entries.push({ name: "MANIFEST.md", data: enc.encode(manifest) });
    return downloadBlobZip("ceh-intake.zip", entries);
  });

  return (
    <section id="priemka" className="relative bg-ink text-paper">
      <div className="bg-blueprint-dark pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:py-24">
        <SectionHead
          dark
          num="11"
          kicker="приёмка в архив · роль куратора"
          lines={[<>Загрузи находку —</>, <span key="i" className="text-paper/50">она ляжет в свою папку</span>]}
          aside={
            <Reveal delay={140}>
              <p className="max-w-sm text-sm leading-relaxed text-paper/70">
                Скриншоты, видео, скрипты и скилы с твоего ПК. Маршрутизатор сам определяет папку студии,
                ты можешь её поменять. Скачай пакет — и распакуй в корень репозитория.
              </p>
            </Reveal>
          }
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          {/* левая колонка: drop + очередь */}
          <div className="flex flex-col gap-4">
            {/* drop-зона */}
            <Reveal>
              <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`relative cursor-pointer border-2 border-dashed px-6 py-12 text-center transition-all duration-300 ${
                  drag
                    ? "border-yellow bg-yellow/10 shadow-[0_0_0_6px_rgba(224,169,28,0.15)]"
                    : "border-paper/30 bg-ink-2/50 hover:border-paper/60 hover:bg-ink-2"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.webp,.gif,.svg,.avif,.mp4,.webm,.mov,.avi,.mkv,.js,.mjs,.cjs,.ts,.md,.markdown,.yaml,.yml"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <svg viewBox="0 0 48 48" className="mx-auto h-12 w-12 text-yellow" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="M24 32V12m0 0-8 8m8-8 8 8" strokeLinecap="square" />
                  <path d="M8 32v6h32v-6" strokeLinecap="square" />
                </svg>
                <p className="mt-4 font-display text-lg font-bold uppercase tracking-[0.1em]">
                  {drag ? "Отпускай — примем" : "Перетащи файлы сюда"}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45">
                  или кликни, чтобы выбрать · картинки · видео · скрипты · .md · .yaml
                </p>
              </div>
            </Reveal>

            {/* маршрутизатор-легенда */}
            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-px border border-line-dark bg-line-dark sm:grid-cols-4">
                {[
                  ["скриншот", "references/screenshots"],
                  ["видео", "assets/videos"],
                  ["скрипт", "scripts"],
                  ["скил / рецепт", "skills · motion"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-ink-2 px-3 py-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-paper/45">{k}</p>
                    <p className="mt-0.5 font-mono text-[10px] font-bold text-yellow">{v}/</p>
                  </div>
                ))}
              </div>
            </Reveal>

            {/* очередь файлов */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
                  файлы в очереди · {files.length}
                </p>
                {files.map((f) => (
                  <QueueRow key={f.id} f={f} onFolder={(folder) => setFolder(f.id, folder)} onRemove={() => removeFile(f.id)} />
                ))}
              </div>
            )}

            {/* очередь скилов */}
            {skills.length > 0 && (
              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">скилы в очереди · {skills.length}</p>
                {skills.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 border border-green/40 bg-green/10 px-3 py-2.5">
                    <span className="font-mono text-[11px] font-bold text-green">skills/{s.slug || slugify(s.name)}/</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-paper/70">{s.name}</span>
                    <button onClick={() => removeSkill(i)} className="font-mono text-[12px] text-paper/40 hover:text-red" aria-label="Убрать скил">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* правая колонка: конструктор + итог */}
          <div className="flex flex-col gap-4">
            <Reveal delay={120}>
              <SkillBuilder
                draft={draft}
                onChange={setDraft}
                onAdd={() => {
                  setSkills((prev) => [...prev, draft]);
                  setDraft(emptySkill());
                }}
              />
            </Reveal>

            {/* итог и скачивание */}
            <Reveal delay={180}>
              <div className="border-2 border-yellow/60 bg-yellow/5 p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-paper/45">к отправке в архив</p>
                    <p className="mt-1 font-display text-3xl font-black leading-none text-yellow">{totalItems}</p>
                    <p className="mt-1 font-mono text-[10px] text-paper/45">
                      объектов · {fmtSize(totalSize)}
                    </p>
                  </div>
                  <div className="text-right font-mono text-[9px] uppercase leading-relaxed tracking-wider text-paper/40">
                    ceh-intake.zip
                    <br />
                    + MANIFEST.md
                  </div>
                </div>
                <button
                  onClick={zip.run}
                  disabled={totalItems === 0 || zip.state === "busy"}
                  className="press-ready mt-4 w-full border-2 border-yellow bg-yellow px-6 py-3.5 font-display text-sm font-bold uppercase tracking-[0.12em] text-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_rgba(224,169,28,0.4)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  {zip.state === "busy"
                    ? "Упаковка…"
                    : zip.state === "done"
                      ? `✓ Отдано · ${zip.count} файлов`
                      : "↓ Скачать и разложить по папкам"}
                </button>
                <p className="mt-3 border-t border-yellow/20 pt-3 font-mono text-[10px] leading-relaxed text-paper/50">
                  Пакет повторяет структуру студии: распакуй в корень — и каждый файл окажется в своей папке.
                  Скриншоты затем привяжи к референсам в meta.yaml.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
      <div className="hazard h-2.5" aria-hidden="true" />
    </section>
  );
}
