/* ------------------------------------------------------------------ */
/* ЦЕХ Code-Video Audio Worklet Synthesizer                           */
/* Аудио-синтез звуковых откликов в выделенном потоке AudioWorklet    */
/* ------------------------------------------------------------------ */

export class AudioWorkletSynthesizer {
  private ac: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private isLoaded = false;
  public soundEnabled = false;

  public async init(): Promise<void> {
    if (this.isLoaded) return;

    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      this.ac = new Ctor();

      // Загружаем наш Worklet процессор
      await this.ac.audioWorklet.addModule("/worklets/sfx-processor.js");
      this.workletNode = new AudioWorkletNode(this.ac, "sfx-processor");

      // Добавляем сверточный импульсный ревербератор (ConvolverNode)
      const convolver = this.ac.createConvolver();
      convolver.buffer = this.createImpulseResponse(this.ac, 1.2, 2.0);

      this.workletNode.connect(convolver);
      convolver.connect(this.ac.destination);
      this.workletNode.connect(this.ac.destination);

      this.isLoaded = true;
    } catch (e) {
      console.warn("[AudioWorkletSynthesizer] Ошибка инициализации Worklet, используется fallback.");
    }
  }

  public enableSound(): boolean {
    this.soundEnabled = true;
    if (this.ac && this.ac.state === "suspended") {
      this.ac.resume().catch(() => undefined);
    }
    return this.soundEnabled;
  }

  public triggerImpact(frequency = 130.0, gain = 0.8): void {
    if (!this.soundEnabled || !this.workletNode) return;
    this.workletNode.port.postMessage({
      type: "TRIGGER_IMPACT",
      frequency,
      gain,
    });
  }

  /**
   * Синтез акустического импульсного отклика ангара/цеха без внешних файловых зависимостей
   */
  private createImpulseResponse(
    ac: AudioContext,
    duration: number,
    decay: number
  ): AudioBuffer {
    const rate = ac.sampleRate;
    const length = rate * duration;
    const impulse = ac.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
    }

    return impulse;
  }

  public destroy(): void {
    if (this.ac) {
      this.ac.close().catch(() => undefined);
      this.ac = null;
    }
  }
}
