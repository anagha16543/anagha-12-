/**
 * js/relay-wave.js — GetLayers "Relay" Signature Green Light Wave
 * 
 * High-performance WebGL & Canvas Aurora Stream Shader.
 * Recreates the exact luminous, silky green/lime undulating wave of light
 * running continuously behind the interface, as featured in GetLayers Relay.
 */

(function () {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // GLSL SHADERS FOR RELAY GREEN LIGHT WAVE
  // ══════════════════════════════════════════════════════════════

  const VERTEX_SHADER_SRC = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER_SRC = `
    precision highp float;
    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_scroll;
    uniform vec2 u_mouse;

    // Organic hash & noise functions
    float hash(vec2 p) {
      p = fract(p * vec2(234.34, 435.345));
      p += dot(p, p + 34.23);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      // Screen space coords: aspect ratio corrected
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      float aspect = u_resolution.x / u_resolution.y;
      
      // Normalized coords (-1 to 1)
      vec2 p = (st * 2.0 - 1.0);
      p.x *= aspect;

      // Base time with organic variation
      float t = u_time * 0.32;
      float scrollFactor = u_scroll * 3.14159 * 1.8;
      float mouseX = (u_mouse.x / u_resolution.x - 0.5) * 0.6;

      // Deep pitch black background
      vec3 finalColor = vec3(0.0, 0.0, 0.0);

      // Color Palette: Pure GetLayers Relay Lime & Aurora Glow
      vec3 coreLime       = vec3(0.82, 1.0, 0.02);   // #CCFF00 Neon Lime core
      vec3 auroraCyan     = vec3(0.0, 0.96, 0.63);   // #00F5A0 Electric Emerald
      vec3 electricGreen  = vec3(0.14, 0.92, 0.38);  // Vibrant vivid green
      vec3 deepGreen      = vec3(0.03, 0.48, 0.24);  // #059669 Forest Glow
      vec3 mistColor      = vec3(0.015, 0.22, 0.11); // Ambient atmospheric mist

      // ── Main Stream Wave Spine ────────────────────────────────
      // Dynamic S-curve: Starts upper-left (hero card), drifts center, then curves right (Tuesday dashboard)
      float yCoord = st.y;
      
      // Interpolate wave base X from top-left (0.24) to bottom-right (0.68) with scroll modulation
      float baseStreamX = mix(0.24, 0.68, pow(1.0 - yCoord, 1.2));
      baseStreamX += sin(scrollFactor * 0.9) * 0.18;

      float spineX = baseStreamX + sin(yCoord * 2.6 - t * 0.65) * 0.16
                                 + cos(yCoord * 5.2 + t * 0.45) * 0.08
                                 + sin(yCoord * 9.4 - t * 1.0) * 0.03
                                 + mouseX * 0.12 * (1.0 - yCoord);

      // Procedural silky fluid undulation
      float fluid = noise(vec2(yCoord * 3.2 - t * 0.35, t * 0.28)) * 0.08;
      spineX += fluid;

      // ── Volumetric Atmospheric Glow ───────────────────────────
      float distSpine = abs(st.x - spineX);
      float broadGlow = exp(-distSpine * 3.8) * 0.55;
      float wideMist  = exp(-distSpine * 1.6) * 0.32;

      finalColor += mistColor * wideMist;
      finalColor += deepGreen * broadGlow;

      // ── Multi-Layered Silky Green Ribbons ─────────────────────
      // Render 7 braided glowing wave strands with varied harmonic frequencies
      for (int i = 0; i < 7; i++) {
        float fi = float(i);
        float phase = fi * 1.05;
        float speed = 0.55 + fi * 0.11;
        float amp = 0.045 + fi * 0.016;

        // Individual strand displacement
        float strandX = spineX + sin(yCoord * (3.6 + fi * 1.3) + t * speed + phase) * amp
                               + cos(yCoord * (6.8 + fi * 1.8) - t * (speed * 0.65)) * (amp * 0.42);

        float d = abs(st.x - strandX);

        // Core laser sharpness & soft bloom
        float core = 0.0018 / (d + 0.0026);
        float bloom = 0.024 / (d * d * 32.0 + 0.055);

        // Modulate color from lime to cyan across strands
        vec3 strandColor = mix(coreLime, auroraCyan, sin(fi * 0.75 + yCoord * 3.2 + t) * 0.5 + 0.5);
        strandColor = mix(strandColor, electricGreen, cos(fi * 1.2 - t * 0.5) * 0.5 + 0.5);

        // Additive lighting accumulation
        finalColor += strandColor * (core * 0.48 + bloom * 0.42);
      }

      // ── Second Harmonic Wave (Cross-interference ribbon) ──────
      // A secondary stream that weaves gently across the main spine
      float wave2X = spineX + sin(yCoord * 2.2 + t * 0.5) * 0.22 - 0.12;
      float d2 = abs(st.x - wave2X);
      float glow2 = 0.015 / (d2 * d2 * 28.0 + 0.07);
      float core2 = 0.0014 / (d2 + 0.0035);
      finalColor += mix(auroraCyan, deepGreen, 0.45) * (core2 * 0.35 + glow2 * 0.3);

      // Subtle atmospheric vignette at the outer edges
      float vignette = smoothstep(1.4, 0.3, length(p * vec2(0.75, 1.0)));
      finalColor *= vignette;

      // Soft ceiling clamp
      finalColor = clamp(finalColor, 0.0, 1.0);

      // Dimmed so text on top stays clearly readable
      finalColor *= 0.72;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  // ══════════════════════════════════════════════════════════════
  // RENDERER CONTROLLER
  // ══════════════════════════════════════════════════════════════

  class RelayWaveRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.ctx2d = null;
      this.program = null;
      this.uniforms = {};
      this.startTime = performance.now();
      this.targetScroll = 0;
      this.currentScroll = 0;
      this.targetMouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
      this.currentMouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
      this.isRunning = false;
      this.isWebGL = false;

      this.init();
    }

    init() {
      // Attempt WebGL
      try {
        const gl = this.canvas.getContext('webgl', {
          powerPreference: 'high-performance',
          alpha: false,
          antialias: true,
          preserveDrawingBuffer: false
        }) || this.canvas.getContext('experimental-webgl');

        if (gl && this.initWebGL(gl)) {
          this.gl = gl;
          this.isWebGL = true;
        }
      } catch (err) {
        console.warn('[Relay Wave] WebGL initialization failed, switching to 2D Canvas fallback:', err);
      }

      // If WebGL failed, setup 2D Canvas Fallback
      if (!this.isWebGL) {
        this.ctx2d = this.canvas.getContext('2d');
      }

      this.resize();
      this.bindEvents();
      this.start();
    }

    initWebGL(gl) {
      const vShader = this.compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fShader = this.compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (!vShader || !fShader) return false;

      const program = gl.createProgram();
      gl.attachShader(program, vShader);
      gl.attachShader(program, fShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('[Relay Wave] Shader link error:', gl.getProgramInfoLog(program));
        return false;
      }

      this.program = program;
      gl.useProgram(program);

      // Quad buffer (-1 to +1)
      const quad = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

      const aPosition = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      // Uniform locations
      this.uniforms = {
        resolution: gl.getUniformLocation(program, 'u_resolution'),
        time: gl.getUniformLocation(program, 'u_time'),
        scroll: gl.getUniformLocation(program, 'u_scroll'),
        mouse: gl.getUniformLocation(program, 'u_mouse'),
      };

      return true;
    }

    compileShader(gl, type, src) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('[Relay Wave] Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      if (this.isWebGL && this.gl) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => this.resize(), { passive: true });

      window.addEventListener('scroll', () => {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        this.targetScroll = docHeight > 0 ? (window.scrollY / docHeight) : 0;
      }, { passive: true });

      window.addEventListener('mousemove', (e) => {
        this.targetMouse.x = e.clientX;
        this.targetMouse.y = e.clientY;
      }, { passive: true });

      // Pause when tab is hidden to save energy
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.start();
        }
      });
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      const loop = (now) => {
        if (!this.isRunning) return;
        this.render(now);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    stop() {
      this.isRunning = false;
    }

    render(now) {
      const elapsed = (now - this.startTime) * 0.001;

      // Smooth lerp for scroll and mouse
      this.currentScroll += (this.targetScroll - this.currentScroll) * 0.05;
      this.currentMouse.x += (this.targetMouse.x - this.currentMouse.x) * 0.05;
      this.currentMouse.y += (this.targetMouse.y - this.currentMouse.y) * 0.05;

      if (this.isWebGL && this.gl && this.program) {
        const gl = this.gl;
        gl.useProgram(this.program);

        gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.uniforms.time, elapsed);
        gl.uniform1f(this.uniforms.scroll, this.currentScroll);
        gl.uniform2f(this.uniforms.mouse, this.currentMouse.x * (this.canvas.width / window.innerWidth), (window.innerHeight - this.currentMouse.y) * (this.canvas.height / window.innerHeight));

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      } else if (this.ctx2d) {
        this.render2DFallback(elapsed);
      }
    }

    // ── High-Performance 2D Canvas Fallback ─────────────────────
    render2DFallback(t) {
      const ctx = this.ctx2d;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Dark background with slight clear trail
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const ribbonCount = 5;
      for (let r = 0; r < ribbonCount; r++) {
        ctx.beginPath();
        const baseOffset = (w * 0.35) + Math.sin(t * 0.5 + r) * (w * 0.1);
        const amp = 80 + r * 30;
        const freq = 0.0025 + r * 0.0005;

        for (let y = 0; y <= h; y += 12) {
          const x = baseOffset + Math.sin(y * freq + t * (0.8 + r * 0.1) + this.currentScroll * 4) * amp;
          if (y === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, 'rgba(0, 245, 160, 0.32)');
        grad.addColorStop(0.5, 'rgba(204, 255, 0, 0.85)');
        grad.addColorStop(1, 'rgba(5, 150, 105, 0.3)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 14 - r * 2;
        ctx.shadowColor = '#CCFF00';
        ctx.shadowBlur = 32 - r * 4;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // ══════════════════════════════════════════════════════════════
  // AUTO-INITIALIZE ON DOM READY
  // ══════════════════════════════════════════════════════════════

  function init() {
    let canvas = document.getElementById('relay-wave-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'relay-wave-canvas';
      canvas.className = 'relay-wave-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    window._relayWaveInstance = new RelayWaveRenderer(canvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

