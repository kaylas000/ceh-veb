---
id: SK-16
name: Программируемое WebGPU/WebCodecs видео
category: design-ux
description: Кадровая виртуализация времени, WebGL2/WebGPU Compute Shaders, WebAudio Worklet DSP и клиентский экспорт видео в MP4/WebM без серверов.
---

# SK-16: Программируемое WebGPU/WebCodecs видео (SOTA Code-Video)

Этот скил задает стандарт построения высокопроизводительных кодовых анимаций и видео-интро нового поколения.

## Ключевые требования (К-19)

1. **Детерминированный кадровый таймлайн (Time Virtualization)**:
   - Все параметры анимаций рассчитываются от дискретного кадра `frame` (0, 1... N) и прогресса `progress (0.0 → 1.0)`.
   - Запрещена прямая зависимость движения от джиттера системных часов `performance.now()`.
2. **GPU-Ускорение (WebGL2 / WebGPU)**:
   - Массивы частиц (>5000) вычисляются на видеокарте в Compute/Vertex шейдерах.
   - Эффект motion blur накладывается честным вектором скорости (Velocity Motion Blur), а не размытием фона.
3. **Звуковой DSP-синтез (AudioWorklet)**:
   - Звуковые отклики генерируются в отдельном потоке `AudioWorkletGlobalScope` без скачивания тяжелых `.mp3` файлов.
4. **Прямой экспорт в MP4 / WebM**:
   - Наличие возможности аппаратного кодирования текущей сцены в медиафайл прямо на чипе устройства с помощью `WebCodecs API`.

## Использование в коде

```typescript
import { DeterministicFrameEngine } from "../lib/code-video/DeterministicFrameEngine";
import { ProceduralVideoRenderer } from "../lib/code-video/ProceduralVideoRenderer";

const engine = new DeterministicFrameEngine({ fps: 60, totalFrames: 204 });
const renderer = new ProceduralVideoRenderer(canvas);

engine.subscribe((ctx, env) => {
  renderer.render(env);
});

engine.play(ctx, width, height);
```
