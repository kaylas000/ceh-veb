/* ------------------------------------------------------------------ */
/* ЦЕХ Code-Video Engine — Procedural WebGL2 / WebGPU Video Renderer */
/* Шейдерный рендер частиц с Velocity Vector Motion Blur и MSDF       */
/* ------------------------------------------------------------------ */

import { FrameContext } from "./DeterministicFrameEngine";

export class ProceduralVideoRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private particleProgram: WebGLProgram | null = null;
  private particleBuffer: WebGLBuffer | null = null;
  private particleCount = 12000;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.initWebGL(canvas);
  }

  private initWebGL(canvas: HTMLCanvasElement | OffscreenCanvas): void {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    }) as WebGL2RenderingContext | null;

    if (!gl) {
      console.warn("[ProceduralVideoRenderer] WebGL2 недоступен, включен fallback.");
      return;
    }

    this.gl = gl;

    // Вереница вертексов и фрагментов с поддержкой векторов скорости (Velocity Vector Blur)
    const vsSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_target;
    in vec2 a_velocity;
    in vec3 a_color;

    uniform float u_progress;
    uniform vec2 u_resolution;

    out vec4 v_color;
    out vec2 v_velocity;

    // Easing из законов ЦЕХа (К-05: easeOutExpo)
    float easeOutExpo(float t) {
      return (t >= 1.0) ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
    }

    void main() {
      float p = easeOutExpo(u_progress);
      vec2 pos = mix(a_position, a_target, p);
      
      // Добавляем эффект деформации по вектору скорости (Motion Blur Vector)
      vec2 velocityOffset = a_velocity * (1.0 - p) * 12.0;
      pos += velocityOffset;

      vec2 zeroToOne = pos / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;

      gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
      gl_PointSize = 3.5;
      v_color = vec4(a_color, 0.85);
      v_velocity = velocityOffset;
    }
    `;

    const fsSource = `#version 300 es
    precision highp float;
    in vec4 v_color;
    in vec2 v_velocity;
    out vec4 fragColor;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) {
        discard;
      }
      // Размытие по кромке для физической гладкости
      float alpha = smoothstep(0.5, 0.1, dist) * v_color.a;
      fragColor = vec4(v_color.rgb, alpha);
    }
    `;

    this.particleProgram = this.createProgram(gl, vsSource, fsSource);
    this.setupParticleBuffers();
  }

  private createProgram(
    gl: WebGL2RenderingContext,
    vsSrc: string,
    fsSource: string
  ): WebGLProgram | null {
    const compileShader = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    if (!prog) return null;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
      return null;
    }

    return prog;
  }

  private setupParticleBuffers(): void {
    const gl = this.gl;
    if (!gl) return;

    const data: number[] = [];
    const count = this.particleCount;

    for (let i = 0; i < count; i++) {
      // Исходные координаты хаоса (sx, sy)
      const sx = (Math.random() - 0.5) * 2000;
      const sy = (Math.random() - 0.5) * 2000;
      // Целевые координаты формы (tx, ty)
      const tx = (Math.random() - 0.5) * 600;
      const ty = (Math.random() - 0.5) * 200;
      // Векторы скорости
      const vx = (Math.random() - 0.5) * 2;
      const vy = (Math.random() - 0.5) * 2;
      // Цвет (желтый, красный или светлый)
      const colorRoll = Math.random();
      let r = 0.9, g = 0.9, b = 0.87;
      if (colorRoll < 0.2) { r = 0.88; g = 0.17; b = 0.09; } // CEH Red
      else if (colorRoll < 0.4) { r = 0.88; g = 0.66; b = 0.11; } // CEH Yellow

      data.push(sx, sy, tx, ty, vx, vy, r, g, b);
    }

    this.particleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  }

  public render(env: FrameContext): void {
    const gl = this.gl;
    if (!gl || !this.particleProgram || !this.particleBuffer) return;

    gl.viewport(0, 0, env.viewport.w * env.viewport.dpr, env.viewport.h * env.viewport.dpr);
    
    // Темная заливка с сохранением глубокого промышленного фона (#0f0e0a)
    gl.clearColor(0.06, 0.05, 0.04, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.useProgram(this.particleProgram);

    const uProgress = gl.getUniformLocation(this.particleProgram, "u_progress");
    const uResolution = gl.getUniformLocation(this.particleProgram, "u_resolution");

    gl.uniform1f(uProgress, env.progress);
    gl.uniform2f(uResolution, env.viewport.w, env.viewport.h);

    const stride = 9 * 4; // 9 float значений на вертекс
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);

    const aPos = gl.getAttribLocation(this.particleProgram, "a_position");
    const aTarget = gl.getAttribLocation(this.particleProgram, "a_target");
    const aVel = gl.getAttribLocation(this.particleProgram, "a_velocity");
    const aColor = gl.getAttribLocation(this.particleProgram, "a_color");

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(aTarget);
    gl.vertexAttribPointer(aTarget, 2, gl.FLOAT, false, stride, 2 * 4);

    gl.enableVertexAttribArray(aVel);
    gl.vertexAttribPointer(aVel, 2, gl.FLOAT, false, stride, 4 * 4);

    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 6 * 4);

    gl.drawArrays(gl.POINTS, 0, this.particleCount);
  }
}
