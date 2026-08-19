/* Упаковка текущей сборки в ZIP прямо в браузере.
   Чистый vanilla: STORE-метод, CRC32, ноль зависимостей.
   Забирает index.html + подключённые css/js — этого достаточно,
   т.к. шрифты и картинки подтягиваются по внешним URL. */

import { useRef, useState } from "react";

export type ZipState = "idle" | "busy" | "done";

/* хук для кнопок «Скачать архив» */
export function useZipDownload(filename = "ceh-pcpolimer-site.zip") {
  const [state, setState] = useState<ZipState>("idle");
  const timer = useRef<number | null>(null);
  const run = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      await downloadBuildZip(filename);
      setState("done");
    } catch (e) {
      console.error(e);
      setState("idle");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 6000);
  };
  return { state, run };
}

export function zipLabel(state: ZipState): string {
  return state === "busy" ? "Упаковка…" : state === "done" ? "Скачано ✓" : "Скачать сайт (ZIP)";
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function fetchAsBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`не удалось забрать ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function downloadBuildZip(filename = "ceh-pcpolimer-site.zip"): Promise<number> {
  const files: Array<{ name: string; data: Uint8Array }> = [];

  const normName = (href: string): string => {
    const u = new URL(href, location.href);
    const path = u.pathname.replace(/^\//, "");
    return path || "index.html";
  };

  /* index.html: делаем пути к ассетам относительными, чтобы распакованный
     сайт работал и в корне домена, и в любой подпапке */
  const htmlRaw = new TextDecoder().decode(await fetchAsBytes(location.href));
  const htmlFixed = htmlRaw.replace(/(src|href)="\/(assets\/)/g, '$1="$2');
  files.push({ name: "index.html", data: new TextEncoder().encode(htmlFixed) });

  const css = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'));
  const js = Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"));
  for (const el of [...css, ...js]) {
    const href = el.getAttribute("href") ?? el.getAttribute("src");
    if (!href) continue;
    const name = normName(href);
    if (files.some((f) => f.name === name)) continue;
    files.push({ name, data: await fetchAsBytes(href) });
  }

  /* сборка ZIP */
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  const body: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);

    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); /* STORE */
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, f.data.length, true);
    lv.setUint32(22, f.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lh.set(nameBytes, 30);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, f.data.length, true);
    cv.setUint32(24, f.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(38, 0x20, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);

    body.push(lh, f.data);
    central.push(ch);
    offset += lh.length + f.data.length;
  }

  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);

  const blob = new Blob([...body, ...central, eocd] as BlobPart[], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return files.length;
}
