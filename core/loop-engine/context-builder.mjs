/* ЦЕХ · Universal Loop Engine — context-builder.mjs
   StudioContextBuilder: собирает промпт из архива студии.

   Mapping: Python-патч -> реальность цеха (каталога studio/ в репозитории нет — корень и есть студия):
     studio/mechanics/  ->  CONSTITUTION.md + anti-slop/BANNED.md + anti-slop/QUOTAS.md + AGENTS.md
     studio/skills/     ->  skills/
     studio/examples/   ->  references/ + projects/_history/ + досье прошлых проектов
     (добавлено)        ->  gates/ (G1–G4), motion/ (easing + рецепты), досье текущего проекта

   Отличия от Python-версии (исправленные баги):
     • functools.lru_cache на методе экземпляра держал self в ключе и тёк между инстансами
       -> кэш экземпляра в Map с лимитом и FIFO-выбросом;
     • str.format() падал на Jinja-шаблоне и на фигурных скобках CSS/JSON
       -> рендер через template.mjs ({{ }}, {% if %}, {% for %}) + безопасный {var};
     • безлимитный rglob('*') -> бюджеты: глубина, число файлов, символы на файл/секцию/всё.
*/

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, isAbsolute, join, resolve, sep } from "node:path";

import { taskGoal } from "./base.mjs";
import { renderTemplateDetailed } from "./template.mjs";
import { humanNumber, toRelPosix, truncate } from "./text.mjs";

/** Приоритет = порядок: сначала обязательная механика, в конце — примеры (их режем первыми). */
export const SECTION_ORDER = Object.freeze(["mechanics", "gates", "skills", "references", "motion", "dossier", "docs", "examples"]);

export const DEFAULT_EXTENSIONS = Object.freeze([".md", ".yaml", ".yml", ".json", ".txt"]);

/** Индексы и законы — всегда первыми внутри секции. */
const INDEX_PRIORITY = ["index.md", "skill-index.md", "recipes.md", "banned.md", "quotas.md", "constitution.md", "agents.md", "pairs.md"];

/** Каталоги, которые нельзя тянуть в контекст. */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "workspace", "__pycache__", "iterations"]);

/**
 * @typedef {Object} SectionSpec
 * @property {string} name
 * @property {string} title
 * @property {string[]} [dirs]   каталоги относительно studioRoot
 * @property {string[]} [files]  конкретные файлы относительно studioRoot
 * @property {boolean} [recursive]
 * @property {number} [maxDepth]
 */

/** @returns {SectionSpec[]} */
function defaultSections(projectName) {
  return [
    {
      name: "mechanics",
      title: "МЕХАНИКА ЦЕХА (ОБЯЗАТЕЛЬНО К ИСПОЛНЕНИЮ)",
      files: ["CONSTITUTION.md", "anti-slop/BANNED.md", "anti-slop/QUOTAS.md", "AGENTS.md"],
      recursive: false,
    },
    { name: "gates", title: "ВОРОТА G1–G4 (КРИТЕРИИ ПРИЁМКИ)", dirs: ["gates"], recursive: true, maxDepth: 1 },
    { name: "skills", title: "СКИЛЫ И ПРИЁМЫ АРХИВА", dirs: ["skills"], recursive: true, maxDepth: 2 },
    { name: "references", title: "РЕФЕРЕНСЫ (takeaway обязателен)", dirs: ["references"], recursive: true, maxDepth: 2 },
    { name: "motion", title: "ДВИЖЕНИЕ: easing-curves + рецепты", dirs: ["motion"], recursive: true, maxDepth: 3 },
    {
      name: "dossier",
      title: "ДОСЬЕ ТЕКУЩЕГО ПРОЕКТА",
      dirs: projectName ? [`projects/${projectName}`] : [],
      recursive: false,
      maxDepth: 1,
    },
    { name: "docs", title: "ПЛЕЙБУКИ И КОНФИГИ", dirs: ["docs", "config"], recursive: true, maxDepth: 2 },
    { name: "examples", title: "ПРИМЕРЫ (FEW-SHOT): прошлые проекты", dirs: ["projects/_history"], recursive: true, maxDepth: 2 },
  ];
}

export const DEFAULT_CONTEXT_TEMPLATE = `# ЗАДАЧА
{{ task }}

Проект: {{ project_name }} · итерация {{ iteration }}{% if max_iterations %} из {{ max_iterations }}{% endif %} · temperature {{ temperature }}

{% if mechanics %}## МЕХАНИКА И ПРАВИЛА (ОБЯЗАТЕЛЬНО)
{{ mechanics }}
{% endif %}
{% if gates %}## ВОРОТА ПРИЁМКИ
{{ gates }}
{% endif %}
{% if skills %}## СКИЛЫ И ПРИЁМЫ
{{ skills }}
{% endif %}
{% if references %}## РЕФЕРЕНСЫ АРХИВА
{{ references }}
{% endif %}
{% if motion %}## ДВИЖЕНИЕ (easing — только из реестра)
{{ motion }}
{% endif %}
{% if dossier %}## ДОСЬЕ ПРОЕКТА
{{ dossier }}
{% endif %}
{% if docs %}## ПЛЕЙБУКИ
{{ docs }}
{% endif %}
{% if examples %}## ПРИМЕРЫ (FEW-SHOT)
{{ examples }}
{% endif %}
{% if history %}## ПРЕДЫДУЩАЯ ПОПЫТКА ПРОВАЛЕНА
{{ feedback_text }}
{% endif %}
`;

export class StudioContextBuilder {
  /** DI-метка для registry.mjs: что injecting в конструктор. */
  static requires = Object.freeze(["studioRoot", "projectName", "projectDir"]);

  /** @param {Record<string, any>} [opts] */
  constructor(opts = {}) {
    this.template = typeof opts.template === "string" && opts.template.trim() ? opts.template : DEFAULT_CONTEXT_TEMPLATE;
    this.studioRoot = opts.studioRoot ? resolve(String(opts.studioRoot)) : null;
    this.projectName = String(opts.projectName ?? "default");
    this.projectDir = opts.projectDir ? resolve(String(opts.projectDir)) : null;

    const include = opts.include && typeof opts.include === "object" ? opts.include : {};
    const explicit = Array.isArray(opts.sections) && opts.sections.length > 0 ? opts.sections.map(String) : null;
    const flag = (name, aliases = []) => {
      if (explicit) return explicit.includes(name);
      if (include[name] !== undefined) return Boolean(include[name]);
      for (const alias of aliases) {
        if (opts[alias] !== undefined) return Boolean(opts[alias]);
        if (include[alias] !== undefined) return Boolean(include[alias]);
      }
      return name !== "docs"; // docs по умолчанию выключены (экономим бюджет)
    };

    /** Включение секций; имена-алиасы из Python-патча (includeSkills/includeMechanics) поддержаны. */
    this.include = {
      mechanics: flag("mechanics", ["includeMechanics"]),
      gates: flag("gates"),
      skills: flag("skills", ["includeSkills"]),
      references: flag("references", ["includeReferences"]),
      motion: flag("motion", ["includeMotion"]),
      dossier: flag("dossier", ["includeDossier"]),
      docs: flag("docs", ["includeDocs"]),
      examples: flag("examples", ["includeExamples"]),
    };

    this.extensions = (opts.fileExtensions ?? opts.extensions ?? DEFAULT_EXTENSIONS).map((e) => String(e).toLowerCase());
    this.maxDepth = Number(opts.maxDepth ?? 3);
    this.maxFilesPerSection = Number(opts.maxFilesPerSection ?? opts.maxFiles ?? 24);
    this.maxCharsPerFile = Number(opts.maxCharsPerFile ?? 4000);
    this.maxCharsPerSection = Number(opts.maxCharsPerSection ?? 24000);
    this.maxTotalChars = Number(opts.maxTotalChars ?? opts.contextCharLimit ?? 120000);
    this.maxExamples = Number(opts.maxExamples ?? 3);
    this.historyWindow = Number(opts.historyWindow ?? 1);
    this.maxCharsPerAttempt = Number(opts.maxCharsPerAttempt ?? 6000);

    this._listCache = new Map();
    this._contentCache = new Map();
    this._cacheLimit = Number(opts.cacheLimit ?? 256);
    /** @type {Array<{name:string,title:string,files:number,chars:number,truncated:boolean}>} */
    this._lastReport = [];
    this._lastWarnings = [];
  }

  /** Сброс кэшей (архив мог измениться между итерациями). */
  clearCache() {
    this._listCache.clear();
    this._contentCache.clear();
    return this;
  }

  _cacheSet(map, key, value) {
    if (map.size >= this._cacheLimit) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
    map.set(key, value);
    return value;
  }

  _readFile(absPath) {
    if (this._contentCache.has(absPath)) return this._contentCache.get(absPath);
    /** @type {string|null} */
    let text = null;
    try {
      if (existsSync(absPath) && statSync(absPath).isFile()) text = readFileSync(absPath, "utf8");
    } catch {
      text = null; // graceful: нет файла — нет секции
    }
    return this._cacheSet(this._contentCache, absPath, text);
  }

  /** Обход каталога с ограничением глубины. */
  _listFiles(dir, maxDepth) {
    const key = `${dir}::${maxDepth}`;
    if (this._listCache.has(key)) return this._listCache.get(key);
    /** @type {string[]} */
    const found = [];
    /** @param {string} current @param {number} depth */
    const walk = (current, depth) => {
      if (depth > maxDepth) return;
      /** @type {import("node:fs").Dirent[]} */
      let entries = [];
      try {
        entries = readdirSync(current, { withFileTypes: true });
      } catch {
        return; // каталога нет — graceful
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const abs = join(current, entry.name);
        if (entry.isDirectory()) {
          if (SKIP_DIRS.has(entry.name)) continue;
          walk(abs, depth + 1);
        } else if (entry.isFile() && this.extensions.includes(extOf(entry.name))) {
          found.push(abs);
        }
      }
    };
    walk(dir, 1);
    return this._cacheSet(this._listCache, key, found);
  }

  /**
   * Контракт ContextBuilder: (task, state, studioRoot) -> строка контекста.
   * @param {string} task
   * @param {import("./base.mjs").LoopState} state
   * @param {string} studioRoot
   * @returns {string}
   */
  build(task, state, studioRoot) {
    const root = resolve(String(studioRoot ?? this.studioRoot ?? process.cwd()));
    const goal = String(task ?? "").trim() || taskGoal(state?.taskInput);
    const iteration = Number(state?.iteration ?? 0);
    /** @type {string[]} */
    const warnings = [];

    /** @type {Record<string, string>} */
    const sections = {};
    /** @type {Array<{name:string,title:string,files:number,chars:number,truncated:boolean}>} */
    const report = [];

    for (const spec of this._resolveSpecs()) {
      const collected = this._collectSection(spec, root, warnings);
      if (!collected.body) continue;
      sections[spec.name] = collected.body;
      report.push({
        name: spec.name,
        title: spec.title,
        files: collected.files,
        chars: collected.body.length,
        truncated: collected.truncated,
      });
    }

    const attempts = this._attemptVars(state);
    const feedback = this._feedbackVars(state);
    const feedbackText = this._renderAttempts(attempts);
    if (feedbackText) sections.feedback_text = feedbackText;

    // Все секции объявлены заранее (пустой строкой): иначе шаблонные {% if docs %}
    // давали бы warning «неизвестная переменная» на каждой сборке контекста.
    const declared = Object.fromEntries([...SECTION_ORDER, "feedback_text"].map((name) => [name, ""]));
    const vars = {
      ...declared,
      task: goal,
      goal,
      project_name: this.projectName,
      projectName: this.projectName,
      iteration: iteration + 1,
      iteration_index: iteration,
      max_iterations: Number(state?.maxIterations ?? 0),
      temperature: Number(state?.temperature ?? 0),
      sections: report,
      history: attempts,
      feedback,
      feedback_text: feedbackText,
      feedbackText,
      artifact: feedback ? this._lastArtifactVars(state) : null,
      previous_output: attempts.length > 0 ? attempts[attempts.length - 1].output : "",
      errors: feedback?.errors ?? [],
      ...sections,
    };

    const rendered = renderTemplateDetailed(this.template, vars, { singleBrace: true });
    warnings.push(...rendered.warnings);

    let text = rendered.text;
    if (text.length > this.maxTotalChars) {
      text = this._enforceBudget(text, sections, vars, text.length - this.maxTotalChars, warnings);
    }

    this._lastReport = report;
    this._lastWarnings = [...new Set(warnings)];
    return text;
  }

  /** Диагностика последнего build(): что попало в контекст (культура evidence). */
  describe() {
    return {
      sections: this._lastReport.map((r) => ({ ...r })),
      warnings: [...this._lastWarnings],
      totalChars: this._lastReport.reduce((sum, r) => sum + r.chars, 0),
    };
  }

  _resolveSpecs() {
    return defaultSections(this.projectName)
      .filter((spec) => this.include[spec.name] === true)
      .map((spec) => ({ ...spec, maxDepth: spec.maxDepth ?? this.maxDepth }));
  }

  /** @param {SectionSpec} spec */
  _collectSection(spec, root, warnings) {
    /** @type {string[]} */
    let paths = [];

    for (const rel of spec.files ?? []) {
      const abs = isAbsolute(rel) ? rel : join(root, rel);
      if (existsSync(abs)) paths.push(abs);
    }
    for (const rel of spec.dirs ?? []) {
      const abs = isAbsolute(rel) ? rel : join(root, rel);
      if (!existsSync(abs)) {
        warnings.push(`секция ${spec.name}: каталог не найден (${rel}) — пропущено`);
        continue;
      }
      paths.push(...this._listFiles(abs, spec.recursive === false ? 1 : spec.maxDepth));
    }

    if (spec.name === "examples") paths = this._limitExamples(paths, root);
    if (spec.name === "dossier") paths = paths.filter((p) => !p.includes(`${sep}site${sep}`) && !p.includes(`${sep}workspace${sep}`));

    paths = [...new Set(paths)].sort((a, b) => indexWeight(a) - indexWeight(b) || a.localeCompare(b));
    const limit = spec.name === "examples" ? Math.max(1, this.maxExamples * 2) : this.maxFilesPerSection;
    let truncated = paths.length > limit;
    paths = paths.slice(0, limit);

    /** @type {string[]} */
    const blocks = [];
    let chars = 0;
    for (const abs of paths) {
      const text = this._readFile(abs);
      if (text === null) continue;
      const remaining = this.maxCharsPerSection - chars;
      if (remaining < 240) {
        truncated = true;
        break;
      }
      const body = truncate(text.trim(), Math.min(this.maxCharsPerFile, remaining));
      if (body.length < text.trim().length) truncated = true;
      const block = `### ФАЙЛ: ${toRelPosix(abs, root)}\n\`\`\`${fenceLang(abs)}\n${body}\n\`\`\``;
      blocks.push(block);
      chars += block.length;
    }

    return blocks.length === 0 ? { body: "", files: 0, truncated: false } : { body: blocks.join("\n\n"), files: blocks.length, truncated };
  }

  /** Примеры: чужие проекты (не текущий, не шаблоны), максимум maxExamples проектов. */
  _limitExamples(paths, root) {
    const templates = new Set([this.projectName, "_TEMPLATE", "_LOOP_TEMPLATE"]);
    const perProject = new Map();
    /** @type {string[]} */
    const out = [];
    for (const abs of paths) {
      const rel = toRelPosix(abs, root);
      if (!rel.startsWith("projects/")) {
        out.push(abs);
        continue;
      }
      const project = rel.split("/")[1];
      if (project === "_history") {
        out.push(abs);
        continue;
      }
      if (templates.has(project)) continue;
      const count = perProject.get(project) ?? 0;
      if (perProject.size >= this.maxExamples && !perProject.has(project)) continue;
      if (count >= 2) continue;
      perProject.set(project, count + 1);
      out.push(abs);
    }
    return out;
  }

  /** @param {import("./base.mjs").LoopState} state */
  _attemptVars(state) {
    const history = Array.isArray(state?.history) ? state.history : [];
    const failed = history.filter((entry) => entry?.feedback && entry.feedback.ok === false);
    const slice = this.historyWindow <= 0 ? failed : failed.slice(-this.historyWindow);
    return slice.map((entry) => ({
      iteration: Number(entry.iteration ?? 0) + 1,
      output: truncate(stringifyArtifact(entry.artifact), this.maxCharsPerAttempt, { mode: "middle" }),
      errors: (entry.feedback?.errors ?? []).map((e) => truncate(String(e), 600)).slice(0, 20),
      codes: entry.feedback?.codes ?? [],
      metrics: entry.feedback?.metrics ?? {},
      raw_output: truncate(stringifyRaw(entry.feedback?.raw), 1200),
    }));
  }

  /** @param {Array<Record<string, any>>} attempts */
  _renderAttempts(attempts) {
    if (attempts.length === 0) return "";
    const parts = attempts.map((a) =>
      [
        `### Итерация ${a.iteration}`,
        a.codes.length > 0 ? `Коды валидатора: ${a.codes.join(", ")}` : "",
        "Твой предыдущий вывод:",
        "```",
        a.output,
        "```",
        "Ошибки валидации (исправь ровно их):",
        a.errors.length > 0 ? a.errors.map((e) => `- ${e}`).join("\n") : "- (не сообщено)",
        "Сырой вывод валидатора:",
        "```",
        a.raw_output,
        "```",
      ]
        .filter((line) => line !== "")
        .join("\n"),
    );
    parts.push("**Проанализируй ошибки выше. Примени МЕХАНИКУ и СКИЛЫ. Выдай ИСПРАВЛЕННЫЙ вариант.**");
    return parts.join("\n\n");
  }

  /** @param {import("./base.mjs").LoopState} state */
  _feedbackVars(state) {
    const history = Array.isArray(state?.history) ? state.history : [];
    const last = history[history.length - 1];
    if (!last?.feedback) return null;
    return {
      ok: last.feedback.ok === true,
      success: last.feedback.ok === true, // алиас под Python-патч
      errors: last.feedback.errors ?? [],
      codes: last.feedback.codes ?? [],
      raw_output: truncate(stringifyRaw(last.feedback.raw), 1200),
      rawOutput: truncate(stringifyRaw(last.feedback.raw), 1200),
      metrics: last.feedback.metrics ?? {},
    };
  }

  /** @param {import("./base.mjs").LoopState} state */
  _lastArtifactVars(state) {
    const history = Array.isArray(state?.history) ? state.history : [];
    const last = history[history.length - 1];
    if (!last?.artifact) return null;
    return { content: truncate(stringifyArtifact(last.artifact), this.maxCharsPerAttempt), metadata: last.artifact.metadata ?? {} };
  }

  /** Жёсткий бюджет: режем хвостовые секции (examples первыми, mechanics последними). */
  _enforceBudget(text, sections, vars, overBudget, warnings) {
    let need = overBudget;
    for (const name of [...SECTION_ORDER].reverse()) {
      if (need <= 0) break;
      const body = sections[name];
      if (!body || body.length < 400) continue;
      const keep = Math.max(200, body.length - need);
      sections[name] = truncate(body, keep);
      need -= body.length - sections[name].length;
      warnings.push(`бюджет контекста: секция «${name}» подрезана до ${humanNumber(keep)} символов`);
    }
    const merged = renderTemplateDetailed(this.template, { ...vars, ...sections }, { singleBrace: true });
    return need > 0 ? truncate(merged.text, this.maxTotalChars) : merged.text;
  }
}

function extOf(name) {
  const idx = name.lastIndexOf(".");
  return idx < 0 ? "" : name.slice(idx).toLowerCase();
}

function fenceLang(absPath) {
  const ext = extOf(basename(absPath)).replace(".", "");
  const map = { md: "markdown", yaml: "yaml", yml: "yaml", json: "json", mjs: "javascript", js: "javascript", txt: "text" };
  return map[ext] ?? ext;
}

function indexWeight(absPath) {
  const idx = INDEX_PRIORITY.indexOf(basename(absPath).toLowerCase());
  return idx === -1 ? 100 : idx;
}

/** Артефакт (строка или карта файлов) → читаемый текст для промпта. */
export function stringifyArtifact(artifact) {
  const content = artifact?.content;
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    return Object.entries(content)
      .map(([path, text]) => `### ФАЙЛ: ${path}\n\`\`\`\n${truncate(String(text), 2000)}\n\`\`\``)
      .join("\n\n");
  }
  return String(content ?? "");
}

function stringifyRaw(raw) {
  if (raw === null || raw === undefined) return "нет";
  if (typeof raw === "string") return raw;
  try {
    return JSON.stringify(raw, null, 2);
  } catch {
    return String(raw);
  }
}
