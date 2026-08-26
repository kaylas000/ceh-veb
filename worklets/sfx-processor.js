/* ------------------------------------------------------------------ */
/* ЦЕХ AudioWorklet Processor — Процедурный синтезатор звуковых SFX   */
/* Выделенный поток реального времени с задержкой <5ms               */
/* ------------------------------------------------------------------ */

class IndustrialSFXProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.phase = 0;
    this.decay = 0.992;
    this.amplitude = 0.0;
    this.frequency = 130.0;
    
    this.port.onmessage = (event) => {
      if (event.data.type === "TRIGGER_IMPACT") {
        this.amplitude = event.data.gain || 0.8;
        this.frequency = event.data.frequency || 130.0;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const channel = output[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      if (this.amplitude > 0.001) {
        // Синусоидальный саб-басовый уход частоты
        const sample = Math.sin(this.phase) * this.amplitude;
        channel[i] = sample;
        
        this.phase += (2 * Math.PI * this.frequency) / sampleRate;
        this.frequency *= 0.9992; // Падение частоты (130Hz -> 38Hz)
        this.amplitude *= this.decay;
      } else {
        channel[i] = 0.0;
      }
    }

    return true;
  }
}

registerProcessor("sfx-processor", IndustrialSFXProcessor);
