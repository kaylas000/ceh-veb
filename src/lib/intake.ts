/* ------------------------------------------------------------------ */
/* Приёмка в архив: маршрутизация загруженных файлов по папкам студии. */
/* ------------------------------------------------------------------ */

export type IntakeKind = "image" | "video" | "script" | "skill" | "recipe" | "texture" | "other";

export interface IntakeFile {
  id: string;
  name: string;
  size: number;
  kind: IntakeKind;
  ext: string;
  /** целевая папка студии, например "references/screenshots" */
  folder: string;
  /** object URL для превью (картинка/видео) */
  previewUrl?: string;
  /** первые строки — для скриптов */
  text?: string;
  file: File;
}

export interface SkillDraft {
  slug: string;
  name: string;
  when: string;
  rules: string[];
  example: string;
  mistakes: string[];
}

export const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"];
export const VIDEO_EXTS = ["mp4", "webm", "mov", "avi", "mkv"];
export const SCRIPT_EXTS = ["js", "mjs", "cjs", "ts"];
export const RECIPE_EXTS = ["yaml", "yml"];
export const SKILL_EXTS = ["md", "markdown"];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "element";
}

/** куда по умолчанию ложится файл данного типа */
export function defaultFolder(kind: IntakeKind): string {
  switch (kind) {
    case "image":
      return "references/screenshots";
    case "video":
      return "assets/videos";
    case "script":
      return "scripts";
    case "skill":
      return "skills";
    case "recipe":
      return "motion/recipes";
    case "texture":
      return "assets/textures";
    default:
      return "assets/misc";
  }
}

export function detectKind(file: File): IntakeKind {
  const ext = extOf(file.name);
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (SCRIPT_EXTS.includes(ext)) return "script";
  if (RECIPE_EXTS.includes(ext)) return "recipe";
  if (SKILL_EXTS.includes(ext)) return "skill";
  return "other";
}

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

/** полный путь файла внутри архива */
export function destPath(f: IntakeFile): string {
  return `${f.folder}/${f.name}`;
}

/** список допустимых папок для ручной перенастройки */
export const FOLDER_OPTIONS = [
  "references/screenshots",
  "assets/images",
  "assets/videos",
  "assets/textures",
  "scripts",
  "skills",
  "motion/recipes",
  "assets/misc",
];

export const KIND_LABEL: Record<IntakeKind, string> = {
  image: "картинка / скриншот",
  video: "видео",
  script: "скрипт",
  skill: "скил (.md)",
  recipe: "рецепт (.yaml)",
  texture: "текстура",
  other: "прочее",
};

/* генерация SKILL.md из формы */
export function renderSkillMd(d: SkillDraft): string {
  const rules = d.rules.filter((r) => r.trim()).map((r, i) => `${i + 1}. ${r.trim()}`).join("\n");
  const mistakes = d.mistakes.filter((m) => m.trim()).map((m) => `- ${m.trim()}`).join("\n");
  return `---
name: ${d.slug}
when: ${d.when.trim()}
---

# ${d.name.trim()}

## Правила
${rules}

## Пример
${d.example.trim()}

## Частые ошибки
${mistakes}
`;
}

export function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

let uid = 0;
export function makeIntakeFile(file: File, folderOverride?: string): IntakeFile {
  const kind = detectKind(file);
  const folder = folderOverride ?? defaultFolder(kind);
  const entry: IntakeFile = {
    id: `${Date.now()}-${++uid}`,
    name: file.name,
    size: file.size,
    kind,
    ext: extOf(file.name),
    folder,
    file,
  };
  if (kind === "image" || kind === "video") entry.previewUrl = URL.createObjectURL(file);
  return entry;
}

export async function readHead(f: IntakeFile, lines = 14): Promise<string> {
  try {
    const text = await f.file.text();
    return text.split("\n").slice(0, lines).join("\n");
  } catch {
    return "";
  }
}
