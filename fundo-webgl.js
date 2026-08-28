// Fundo animado em WebGL2 puro (sem libs externas): blobs orgânicos via SDF,
// gradiente roxo/ciano/laranja, grain e vinheta. Degrada em silêncio se
// WebGL2 não estiver disponível — o body mantém a cor de fundo via CSS.
(function () {
  "use strict";

  var canvas = document.getElementById("fundo-canvas");
  if (!canvas) return;

  var gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) {
    canvas.remove();
    return;
  }

  var VERT_SRC =
    "#version 300 es\n" +
    "void main(){\n" +
    "  vec2 pos[3] = vec2[3](vec2(-1.0,-1.0), vec2(3.0,-1.0), vec2(-1.0,3.0));\n" +
    "  gl_Position = vec4(pos[gl_VertexID], 0.0, 1.0);\n" +
    "}";

  var FRAG_SRC =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 uResolution;\n" +
    "uniform float uTime;\n" +
    "uniform vec2 uMouse;\n" +
    "uniform vec3 uBg;\n" +
    "uniform float uIntensity;\n" +
    "uniform float uBlobGain;\n" +
    "out vec4 fragColor;\n" +
    "\n" +
    "float sdCircle(vec2 p, vec2 c, float r){\n" +
    "  return length(p - c) - r;\n" +
    "}\n" +
    "\n" +
    "float smin(float a, float b, float k){\n" +
    "  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);\n" +
    "  return mix(b, a, h) - k * h * (1.0 - h);\n" +
    "}\n" +
    "\n" +
    "float hash(vec2 p){\n" +
    "  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);\n" +
    "}\n" +
    "\n" +
    "void main(){\n" +
    "  vec2 uv = gl_FragCoord.xy / uResolution;\n" +
    "  float scale = min(uResolution.x, uResolution.y);\n" +
    "  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / scale;\n" +
    "  vec2 mouseP = (uMouse * uResolution - 0.5 * uResolution) / scale;\n" +
    "  float t = uTime;\n" +
    "\n" +
    "  vec2 c1 = vec2(-0.34, 0.12) + vec2(sin(t * 0.15), cos(t * 0.12) * 0.7) * 0.34;\n" +
    "  vec2 c2 = vec2(0.36, -0.14) + vec2(cos(t * 0.11), sin(t * 0.17) * 0.8) * 0.32;\n" +
    "  vec2 c3wander = vec2(0.0, 0.3) + vec2(sin(t * 0.09 + 2.0), cos(t * 0.14 + 1.0)) * 0.36;\n" +
    "  vec2 c3 = mix(c3wander, mouseP, 0.4);\n" +
    "\n" +
    "  float d1 = sdCircle(p, c1, 0.5);\n" +
    "  float d2 = sdCircle(p, c2, 0.42);\n" +
    "  float d3 = sdCircle(p, c3, 0.46);\n" +
    "\n" +
    "  float k = 0.45;\n" +
    "  float d = smin(smin(d1, d2, k), d3, k);\n" +
    "  float field = smoothstep(0.4, -0.3, d);\n" +
    "\n" +
    "  float i1 = pow(smoothstep(0.85, -0.15, d1), 2.5);\n" +
    "  float i2 = pow(smoothstep(0.85, -0.15, d2), 2.5);\n" +
    "  float i3 = pow(smoothstep(0.85, -0.15, d3), 2.5);\n" +
    "  float isum = max(i1 + i2 + i3, 0.0001);\n" +
    "\n" +
    "  vec3 purple = vec3(0.545, 0.298, 0.965);\n" +
    "  vec3 cyanC  = vec3(0.145, 0.827, 0.918);\n" +
    "  vec3 orange = vec3(0.980, 0.502, 0.180);\n" +
    "\n" +
    "  vec3 blobColor = (purple * i1 + cyanC * i2 + orange * i3) / isum * uBlobGain;\n" +
    "  vec3 color = mix(uBg, blobColor, field * uIntensity);\n" +
    "\n" +
    "  float g = hash(gl_FragCoord.xy + t * 57.0);\n" +
    "  color += (g - 0.5) * 0.1;\n" +
    "\n" +
    "  float vig = smoothstep(1.1, 0.4, length(uv - 0.5) * 1.55);\n" +
    "  color *= mix(0.82, 1.0, vig);\n" +
    "\n" +
    "  fragColor = vec4(color, 1.0);\n" +
    "}";

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT_SRC);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) {
    canvas.remove();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    canvas.remove();
    return;
  }

  gl.bindVertexArray(gl.createVertexArray());
  gl.useProgram(program);

  var uResolution = gl.getUniformLocation(program, "uResolution");
  var uTime = gl.getUniformLocation(program, "uTime");
  var uMouse = gl.getUniformLocation(program, "uMouse");
  var uBg = gl.getUniformLocation(program, "uBg");
  var uIntensity = gl.getUniformLocation(program, "uIntensity");
  var uBlobGain = gl.getUniformLocation(program, "uBlobGain");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  var mouseTarget = [0.5, 0.5];
  var mouseSmooth = [0.5, 0.5];

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function hexToRgb01(hex) {
    hex = (hex || "").trim().replace("#", "");
    if (hex.length === 3) {
      hex = hex.split("").map(function (c) { return c + c; }).join("");
    }
    var num = parseInt(hex, 16) || 0;
    return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
  }

  var bgColor = [0.043, 0.059, 0.102];
  var intensity = 0.85;
  var blobGain = 0.42;

  function readTheme() {
    var raiz = document.documentElement;
    var explicito = raiz.getAttribute("data-theme");
    var claro = explicito ? explicito === "light" : window.matchMedia("(prefers-color-scheme: light)").matches;
    var hex = getComputedStyle(raiz).getPropertyValue("--fundo") || (claro ? "#f6f6fb" : "#0b0f1a");
    bgColor = hexToRgb01(hex);
    // Blobs saturados mas de baixa luminância: preserva a cor sem derrubar
    // o contraste do texto por cima.
    intensity = claro ? 0.58 : 0.85;
    blobGain = claro ? 0.95 : 0.42;
  }

  readTheme();

  var temaToggle = document.getElementById("tema-toggle");
  if (temaToggle) {
    temaToggle.addEventListener("click", function () {
      setTimeout(readTheme, 0);
    });
  }
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", readTheme);

  window.addEventListener(
    "pointermove",
    function (e) {
      mouseTarget[0] = e.clientX / window.innerWidth;
      mouseTarget[1] = 1 - e.clientY / window.innerHeight;
    },
    { passive: true }
  );

  window.addEventListener("resize", resize);
  resize();

  var start = performance.now();

  function frame(now) {
    var t = reduceMotion ? 0 : (now - start) / 1000;

    mouseSmooth[0] += (mouseTarget[0] - mouseSmooth[0]) * 0.06;
    mouseSmooth[1] += (mouseTarget[1] - mouseSmooth[1]) * 0.06;

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseSmooth[0], mouseSmooth[1]);
    gl.uniform3f(uBg, bgColor[0], bgColor[1], bgColor[2]);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uBlobGain, blobGain);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
