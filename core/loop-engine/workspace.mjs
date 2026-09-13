/* ЦЕХ · Universal Loop Engine — workspace.mjs
   Рабочая директория проекта: materialize артефакта, копирование тестов, манифест записи.

   Безопасность: все пути артефакта проходят safeResolveInside — запись вне workspace
   (../../.github/…, абсолютные пути) невозможна. Этого не было в Python-патче.
*/

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";

import { safeResolveInside, toRelPosix } from "./text.mjs";

const MANIFEST = ".loop-manifest.json";

/** Создаёт (рекурсивно) и возвращает абсолютный путь. */
export function ensureDir(dir) {
  const abs = resolve(String(dir));
  mkdirSync(abs, { recursive: true });
  return abs;
}

/** Читает манифест ранее записанных файлов (чтобы убирать только своё). */
export function readManifest(workspaceDir) {
  const path = join(workspaceDir, MANIFEST);
  try {
    if (!existsSync(path)) return [];
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(parsed?.files) ? parsed.files.map(String) : [];
  } catch {
    return [];
  }
}

function writeManifest(workspaceDir, files) {
  try {
    writeFileSync(join(workspaceDir, MANIFEST), `${JSON.stringify({ updatedAt: new Date().toISOString(), files }, null, 2)}\n`, "utf8");
  } catch {
    // манифест не критичен: без него просто не чистим старые файлы
  }
}

/** Удаляет файлы, записанные предыдущими итерациями (только по манифесту). */
export function cleanManifestFiles(workspaceDir) {
  const files = readManifest(workspaceDir);
  let removed = 0;
  for (const rel of files) {
    try {
      const abs = safeResolveInside(rel, workspaceDir);
      if (existsSync(abs) && statSync(abs).isFile()) {
        rmSync(abs, { force: true });
        removed += 1;
      }
    } catch {
      /* путь вне workspace — игнорируем */
    }
  }
  writeManifest(workspaceDir, []);
  return removed;
}

/**
 * Записывает артефакт в рабочую директорию.
 * @param {import("./base.mjs").Artifact} artifact
 * @param {string} workspaceDir
 * @param {{ defaultFilename?: string, clean?: boolean }} [opts]
 * @returns {{ files: Array<{ rel: string, abs: string, chars: number }>, entry: string|null, kind: 'text'|'files', removed: number }}
 */
export function writeArtifact(artifact, workspaceDir, opts = {}) {
  const dir = ensureDir(workspaceDir);
  const defaultFilename = opts.defaultFilename ?? "main.mjs";
  const removed = opts.clean === false ? 0 : cleanManifestFiles(dir);

  /** @type {Array<{ rel: string, abs: string, chars: number }>} */
  const written = [];
  const content = artifact?.content;

  const writeOne = (rel, text) => {
    const abs = safeResolveInside(rel, dir); // бросает при попытке выйти за workspace
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, String(text ?? ""), "utf8");
    written.push({ rel: toRelPosix(abs, dir), abs, chars: String(text ?? "").length });
  };

  if (typeof content === "string") {
    writeOne(defaultFilename, content);
  } else if (content && typeof content === "object") {
    for (const [rel, text] of Object.entries(content)) writeOne(rel, text);
  } else {
    throw new TypeError("артефакт должен содержать строку или карту файлов");
  }

  writeManifest(dir, written.map((f) => f.rel));

  const entry =
    written.find((f) => f.rel === defaultFilename)?.abs ??
    written.find((f) => /\.(mjs|cjs|js)$/.test(f.rel) && !f.rel.includes("/"))?.abs ??
    written.find((f) => /\.(mjs|cjs|js)$/.test(f.rel))?.abs ??
    null;

  return { files: written, entry, kind: typeof content === "string" ? "text" : "files", removed };
}

/**
 * Копирует каталог (например tests/ проекта) в workspace.
 * @param {string} srcDir
 * @param {string} dstDir
 * @param {{ extensions?: string[] }} [opts]
 * @returns {string[]} скопированные файлы (abs)
 */
export function copyDir(srcDir, dstDir, opts = {}) {
  if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) return [];
  ensureDir(dstDir);
  const extensions = (opts.extensions ?? [".mjs", ".js", ".cjs", ".json", ".md", ".txt", ".py"]).map((e) => e.toLowerCase());
  /** @type {string[]} */
  const copied = [];
  cpSync(srcDir, dstDir, {
    recursive: true,
    force: true,
    filter: (source) => {
      const name = basename(source);
      if (name === MANIFEST || name === "workspace" || name === "node_modules" || name.startsWith(".")) return false;
      if (statSync(source).isDirectory()) return true;
      const ext = name.includes(".") ? `.${String(name.split(".").pop()).toLowerCase()}` : "";
      return extensions.includes(ext);
    },
  });
  for (const rel of readdirSync(dstDir, { recursive: true })) {
    const abs = join(dstDir, String(rel));
    if (existsSync(abs) && statSync(abs).isFile()) copied.push(abs);
  }
  return copied;
}

/** Список файлов каталога (без рекурсии в node_modules/workspace). */
export function listFiles(dir, opts = {}) {
  if (!existsSync(dir)) return [];
  const maxDepth = Number(opts.maxDepth ?? 2);
  /** @type {string[]} */
  const out = [];
  const walk = (current, depth) => {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name === "node_modules" || entry.name === MANIFEST) continue;
      const abs = join(current, entry.name);
      if (entry.isDirectory()) walk(abs, depth + 1);
      else if (entry.isFile()) out.push(abs);
    }
  };
  walk(resolve(dir), 1);
  return out;
}

/** Абсолютный путь: относительные считаем от studioRoot. */
export function toAbs(pathLike, studioRoot) {
  return isAbsolute(String(pathLike)) ? resolve(String(pathLike)) : resolve(studioRoot, String(pathLike));
}
