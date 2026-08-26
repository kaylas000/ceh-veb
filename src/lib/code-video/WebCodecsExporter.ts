/* ------------------------------------------------------------------ */
/* ЦЕХ Code-Video Engine — WebCodecs Client-Side Exporter            */
/* Экспорт программного видео кадр-в-кадр на клиенте в MP4 / WebM     */
/* ------------------------------------------------------------------ */

import { DeterministicFrameEngine, FrameRenderCallback } from "./DeterministicFrameEngine";

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percent: number;
}

export class WebCodecsExporter {
  public async exportToWebM(
    renderFn: FrameRenderCallback,
    width = 1920,
    height = 1080,
    fps = 60,
    totalFrames = 204,
    onProgress?: (p: ExportProgress) => void
  ): Promise<Blob> {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;

    const engine = new DeterministicFrameEngine({ fps, totalFrames });
    engine.subscribe(renderFn);

    const htmlCanvas = canvas as unknown as HTMLCanvasElement;
    const stream = htmlCanvas.captureStream ? htmlCanvas.captureStream(fps) : null;

    if (!stream) {
      throw new Error("captureStream не поддерживается на данном хосте");
    }

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: 10_000_000,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(blob);
      };

      mediaRecorder.onerror = (e) => reject(e);

      mediaRecorder.start();

      let frame = 0;
      const renderNextFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        engine.renderFrame(ctx as unknown as CanvasRenderingContext2D, frame, width, height, 1);
        if (onProgress) {
          onProgress({
            currentFrame: frame,
            totalFrames,
            percent: Math.round((frame / totalFrames) * 100),
          });
        }

        frame++;
        setTimeout(renderNextFrame, 1000 / fps);
      };

      renderNextFrame();
    });
  }
}
