import * as THREE from "three";

// Noise background with Perlin noise + dithering
// Audio reactivity warps and distorts the texture fluidly
export function initNoiseBackground(container: HTMLElement) {
  // ============================================
  // CONFIGURATION - Tweak these in console!
  // Use: noiseBackground.setConfig('key', value)
  // ============================================
  const config = {
    // ===================
    // NOISE SHAPE
    // ===================
    noiseScale: 3.0, // Size of noise blobs (1-10, lower = larger blobs)
    noiseDetail: 5, // FBM octaves (1-8, more = finer detail)
    noiseLacunarity: 2.0, // How quickly detail scales (1.5-3.0)
    noisePersistence: 0.5, // How quickly amplitude decreases (0.3-0.7)

    // ===================
    // ANIMATION
    // ===================
    flowSpeed: 0.15, // Base flow speed (0.05-0.5)
    flowComplexity: 0.3, // How much the flow swirls (0.1-1.0)
    warpAmount: 0.3, // Domain warping intensity (0-1.0)

    // ===================
    // AUDIO REACTIVITY
    // ===================
    audioWarpStrength: 0.75, // How much audio warps the texture shape (0-2.0)
    audioFlowBoost: 0, // How much audio speeds up movement (0-5.0) - 0 = no speed change
    audioDistortion: 1, // Extra texture distortion from audio (0-1.0)
    audioSmoothing: 0.7, // Audio smoothing (0.5-0.95, higher = smoother)
    audioBaseline: 0.45, // Baseline audio level when no music (0-1.0) - prevents sudden shift on first play

    // ===================
    // VISUAL STYLE
    // ===================
    pixelSize: 1.0, // Pixel size for retro look (1-4, 1 = no pixelation)
    ditherStrength: 1.0, // Dithering intensity (0-1, 0 = smooth gradient)
    contrast: 1.0, // Output contrast (0.5-2.0)
    brightness: 0.0, // Output brightness shift (-0.3 to 0.3)

    // ===================
    // COLORS [r, g, b] (0.0 - 1.0)
    // ===================
    // Dark theme: deep navy to medium blue
    darkColor1: [0.02, 0.04, 0.12] as [number, number, number],
    darkColor2: [0.08, 0.15, 0.35] as [number, number, number],
    // Light theme: pale sky blue to soft blue
    lightColor1: [0.85, 0.92, 1.0] as [number, number, number],
    lightColor2: [0.6, 0.75, 0.95] as [number, number, number],

    // ===================
    // PERFORMANCE
    // ===================
    fps: 24,
    pixelRatio: Math.min(window.devicePixelRatio, 1.5),
  };
  // ============================================

  // Persist time across navigations
  const STORAGE_KEY = "noise-bg-time";
  let timeOffset = parseFloat(sessionStorage.getItem(STORAGE_KEY) || "0");

  // Smoothed audio values for fluid response
  // Initialize to baseline so there's no sudden shift when music first starts
  let smoothedLevel = config.audioBaseline;
  let smoothedBass = config.audioBaseline;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(config.pixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Shader with domain warping + audio-reactive distortion
  const material = new THREE.ShaderMaterial({
    uniforms: {
      u_time: { value: timeOffset },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
      u_isDark: {
        value:
          document.documentElement.getAttribute("data-theme") === "dark"
            ? 1.0
            : 0.0,
      },

      // Noise params
      u_noiseScale: { value: config.noiseScale },
      u_lacunarity: { value: config.noiseLacunarity },
      u_persistence: { value: config.noisePersistence },

      // Flow params
      u_flowSpeed: { value: config.flowSpeed },
      u_flowComplexity: { value: config.flowComplexity },
      u_warpAmount: { value: config.warpAmount },

      // Audio params
      u_audioLevel: { value: 0.0 },
      u_audioBass: { value: 0.0 },
      u_audioWarp: { value: config.audioWarpStrength },
      u_audioFlow: { value: config.audioFlowBoost },
      u_audioDistort: { value: config.audioDistortion },

      // Visual params
      u_pixelSize: { value: config.pixelSize },
      u_ditherStrength: { value: config.ditherStrength },
      u_contrast: { value: config.contrast },
      u_brightness: { value: config.brightness },

      // Colors (vec3)
      u_darkColor1: { value: new THREE.Vector3(...config.darkColor1) },
      u_darkColor2: { value: new THREE.Vector3(...config.darkColor2) },
      u_lightColor1: { value: new THREE.Vector3(...config.lightColor1) },
      u_lightColor2: { value: new THREE.Vector3(...config.lightColor2) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      varying vec2 vUv;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform float u_isDark;

      // Noise params
      uniform float u_noiseScale;
      uniform float u_lacunarity;
      uniform float u_persistence;

      // Flow params
      uniform float u_flowSpeed;
      uniform float u_flowComplexity;
      uniform float u_warpAmount;

      // Audio params
      uniform float u_audioLevel;
      uniform float u_audioBass;
      uniform float u_audioWarp;
      uniform float u_audioFlow;
      uniform float u_audioDistort;

      // Visual params
      uniform float u_pixelSize;
      uniform float u_ditherStrength;
      uniform float u_contrast;
      uniform float u_brightness;

      // Colors (RGB)
      uniform vec3 u_darkColor1;
      uniform vec3 u_darkColor2;
      uniform vec3 u_lightColor1;
      uniform vec3 u_lightColor2;

      // Permutation polynomial
      vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }

      vec2 fade(vec2 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      }

      // Classic Perlin noise
      float cnoise(vec2 P) {
        vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
        vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
        Pi = mod(Pi, 289.0);
        vec4 ix = Pi.xzxz;
        vec4 iy = Pi.yyww;
        vec4 fx = Pf.xzxz;
        vec4 fy = Pf.yyww;
        vec4 i = permute(permute(ix) + iy);
        vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0;
        vec4 gy = abs(gx) - 0.5;
        vec4 tx = floor(gx + 0.5);
        gx = gx - tx;
        vec2 g00 = vec2(gx.x, gy.x);
        vec2 g10 = vec2(gx.y, gy.y);
        vec2 g01 = vec2(gx.z, gy.z);
        vec2 g11 = vec2(gx.w, gy.w);
        vec4 norm = 1.79284291400159 - 0.85373472095314 *
          vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
        g00 *= norm.x;
        g01 *= norm.y;
        g10 *= norm.z;
        g11 *= norm.w;
        float n00 = dot(g00, vec2(fx.x, fy.x));
        float n10 = dot(g10, vec2(fx.y, fy.y));
        float n01 = dot(g01, vec2(fx.z, fy.z));
        float n11 = dot(g11, vec2(fx.w, fy.w));
        vec2 fade_xy = fade(Pf.xy);
        vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
        float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
        return 2.3 * n_xy;
      }

      // Fractional Brownian motion with configurable octaves
      float fbm(vec2 p, int octaves) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        float maxValue = 0.0;

        for (int i = 0; i < 8; i++) {
          if (i >= octaves) break;
          value += amplitude * cnoise(p * frequency);
          maxValue += amplitude;
          frequency *= u_lacunarity;
          amplitude *= u_persistence;
        }
        return value / maxValue;
      }

      // Domain warping - distorts coordinates using noise
      vec2 warp(vec2 p, float t, float amount) {
        float n1 = cnoise(p + t * 0.3);
        float n2 = cnoise(p + vec2(5.2, 1.3) + t * 0.2);
        return p + vec2(n1, n2) * amount;
      }

      // 8x8 Bayer dithering matrix
      float bayerMatrix(vec2 position) {
        int x = int(mod(position.x, 8.0));
        int y = int(mod(position.y, 8.0));
        int index = x + y * 8;

        // Bayer 8x8 pattern (unrolled for WebGL compatibility)
        float threshold = 0.0;
        if (index == 0) threshold = 0.0/64.0;
        else if (index == 1) threshold = 32.0/64.0;
        else if (index == 2) threshold = 8.0/64.0;
        else if (index == 3) threshold = 40.0/64.0;
        else if (index == 4) threshold = 2.0/64.0;
        else if (index == 5) threshold = 34.0/64.0;
        else if (index == 6) threshold = 10.0/64.0;
        else if (index == 7) threshold = 42.0/64.0;
        else if (index == 8) threshold = 48.0/64.0;
        else if (index == 9) threshold = 16.0/64.0;
        else if (index == 10) threshold = 56.0/64.0;
        else if (index == 11) threshold = 24.0/64.0;
        else if (index == 12) threshold = 50.0/64.0;
        else if (index == 13) threshold = 18.0/64.0;
        else if (index == 14) threshold = 58.0/64.0;
        else if (index == 15) threshold = 26.0/64.0;
        else if (index == 16) threshold = 12.0/64.0;
        else if (index == 17) threshold = 44.0/64.0;
        else if (index == 18) threshold = 4.0/64.0;
        else if (index == 19) threshold = 36.0/64.0;
        else if (index == 20) threshold = 14.0/64.0;
        else if (index == 21) threshold = 46.0/64.0;
        else if (index == 22) threshold = 6.0/64.0;
        else if (index == 23) threshold = 38.0/64.0;
        else if (index == 24) threshold = 60.0/64.0;
        else if (index == 25) threshold = 28.0/64.0;
        else if (index == 26) threshold = 52.0/64.0;
        else if (index == 27) threshold = 20.0/64.0;
        else if (index == 28) threshold = 62.0/64.0;
        else if (index == 29) threshold = 30.0/64.0;
        else if (index == 30) threshold = 54.0/64.0;
        else if (index == 31) threshold = 22.0/64.0;
        else if (index == 32) threshold = 3.0/64.0;
        else if (index == 33) threshold = 35.0/64.0;
        else if (index == 34) threshold = 11.0/64.0;
        else if (index == 35) threshold = 43.0/64.0;
        else if (index == 36) threshold = 1.0/64.0;
        else if (index == 37) threshold = 33.0/64.0;
        else if (index == 38) threshold = 9.0/64.0;
        else if (index == 39) threshold = 41.0/64.0;
        else if (index == 40) threshold = 51.0/64.0;
        else if (index == 41) threshold = 19.0/64.0;
        else if (index == 42) threshold = 59.0/64.0;
        else if (index == 43) threshold = 27.0/64.0;
        else if (index == 44) threshold = 49.0/64.0;
        else if (index == 45) threshold = 17.0/64.0;
        else if (index == 46) threshold = 57.0/64.0;
        else if (index == 47) threshold = 25.0/64.0;
        else if (index == 48) threshold = 15.0/64.0;
        else if (index == 49) threshold = 47.0/64.0;
        else if (index == 50) threshold = 7.0/64.0;
        else if (index == 51) threshold = 39.0/64.0;
        else if (index == 52) threshold = 13.0/64.0;
        else if (index == 53) threshold = 45.0/64.0;
        else if (index == 54) threshold = 5.0/64.0;
        else if (index == 55) threshold = 37.0/64.0;
        else if (index == 56) threshold = 63.0/64.0;
        else if (index == 57) threshold = 31.0/64.0;
        else if (index == 58) threshold = 55.0/64.0;
        else if (index == 59) threshold = 23.0/64.0;
        else if (index == 60) threshold = 61.0/64.0;
        else if (index == 61) threshold = 29.0/64.0;
        else if (index == 62) threshold = 53.0/64.0;
        else threshold = 21.0/64.0;

        return threshold;
      }

      float dither(vec2 position, float brightness, float strength) {
        float threshold = bayerMatrix(position);
        float dithered = brightness > threshold ? 1.0 : 0.0;
        return mix(brightness, dithered, strength);
      }

      void main() {
        // Pixelation
        vec2 pixelCoord = floor(gl_FragCoord.xy / u_pixelSize);
        vec2 uv = pixelCoord / (u_resolution / u_pixelSize);

        // Time with audio-reactive speed boost
        float audioSpeed = 1.0 + u_audioLevel * u_audioFlow;
        float t = u_time * audioSpeed;

        // Base coordinates with scale
        vec2 p = uv * u_noiseScale;

        // Flowing movement
        p.x += sin(t * u_flowComplexity * 0.5) * u_flowComplexity;
        p.y += cos(t * u_flowComplexity * 0.4) * u_flowComplexity;

        // Domain warping (base)
        float warpAmt = u_warpAmount + u_audioBass * u_audioWarp;
        p = warp(p, t, warpAmt);

        // Audio-reactive distortion layer
        float distortAmt = u_audioLevel * u_audioDistort;
        vec2 distort = vec2(
          cnoise(p * 2.0 + t * 0.5),
          cnoise(p * 2.0 + vec2(3.7, 1.2) + t * 0.4)
        ) * distortAmt;
        p += distort;

        // Second warp pass for extra fluidity when audio is active
        if (u_audioBass > 0.1) {
          p = warp(p + vec2(10.0), t * 1.5, u_audioBass * u_audioWarp * 0.5);
        }

        // Generate final noise
        float n = fbm(p + t * 0.1, 5);
        n = n * 0.5 + 0.5; // Normalize to 0-1

        // Apply contrast and brightness
        n = (n - 0.5) * u_contrast + 0.5 + u_brightness;
        n = clamp(n, 0.0, 1.0);

        // Apply dithering
        float final = dither(pixelCoord, n, u_ditherStrength);

        // Theme-aware colors (RGB)
        vec3 c1 = mix(u_lightColor1, u_darkColor1, u_isDark);
        vec3 c2 = mix(u_lightColor2, u_darkColor2, u_isDark);

        vec3 color = mix(c1, c2, final);

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Update theme
  function updateTheme() {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    material.uniforms.u_isDark.value = isDark ? 1.0 : 0.0;
  }

  // Handle resize
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    material.uniforms.u_resolution.value.set(w, h);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("themechange", updateTheme);
  updateTheme();

  // Animation loop
  let animationId: number;
  const startTime = performance.now();
  let lastFrame = 0;
  const frameInterval = 1000 / config.fps;

  function animate(timestamp: number) {
    animationId = requestAnimationFrame(animate);

    const delta = timestamp - lastFrame;
    if (delta < frameInterval) return;
    lastFrame = timestamp - (delta % frameInterval);

    const elapsed = (performance.now() - startTime) / 1000;
    const currentTime = timeOffset + elapsed * config.flowSpeed;

    material.uniforms.u_time.value = currentTime;
    material.uniforms.u_audioLevel.value = smoothedLevel;
    material.uniforms.u_audioBass.value = smoothedBass;

    // Save time periodically for persistence
    sessionStorage.setItem(STORAGE_KEY, currentTime.toString());

    renderer.render(scene, camera);
  }

  animate(0);

  // Public API
  return {
    // Audio input (called from music player)
    setAudioLevels(level: number, bass: number) {
      // console.log("audio levels", level, bass);
      // Use baseline as minimum, so we never go below it
      const targetLevel = Math.max(level, config.audioBaseline);
      const targetBass = Math.max(bass, config.audioBaseline);

      // Smooth the audio values for fluid response
      smoothedLevel +=
        (targetLevel - smoothedLevel) * (1 - config.audioSmoothing);
      smoothedBass += (targetBass - smoothedBass) * (1 - config.audioSmoothing);
    },

    destroy() {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("themechange", updateTheme);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
