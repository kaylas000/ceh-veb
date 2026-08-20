/* Упаковка файлов в ZIP прямо в браузере.
   Чистый vanilla: STORE-метод, CRC32, ноль зависимостей. */

import { useRef, useState } from "react";

export interface ZipEntry {
  name: string;
  content: string;
}

export type ZipState = "idle" | "busy" | "done";

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

/* бинарная версия: контент уже в байтах (видео, картинки, любые файлы) */
export async function downloadBlobZip(
  filename: string,
  entries: Array<{ name: string; data: Uint8Array }>,
): Promise<number> {
  return zipAndDownload(filename, entries);
}

export async function downloadFilesZip(filename: string, entries: ZipEntry[]): Promise<number> {
  const enc = new TextEncoder();
  const files = entries.map((e) => ({ name: e.name, data: enc.encode(e.content) }));
  return zipAndDownload(filename, files);
}

function zipAndDownload(filename: string, files: Array<{ name: string; data: Uint8Array }>): number {
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

/* хук для кнопок «Скачать» */
export function useZipDownload(action: () => Promise<number>) {
  const [state, setState] = useState<ZipState>("idle");
  const [count, setCount] = useState(0);
  const timer = useRef<number | null>(null);
  const run = async () => {
    if (state === "busy") return;
    setState("busy");
    try {
      const n = await action();
      setCount(n);
      setState("done");
    } catch (e) {
      console.error(e);
      setState("idle");
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 7000);
  };
  return { state, count, run };
}
