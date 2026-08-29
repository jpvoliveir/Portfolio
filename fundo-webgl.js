// Fundo animado em WebGL2 puro (sem libs externas): blobs orgânicos via SDF,
// grain e vinheta. Degrada em silêncio se WebGL2 não estiver disponível — o
// body mantém a cor de fundo via CSS.
//
// Paleta "névoa fria": faixa estreita de matiz (196°–248°) com saturação baixa
// (14–26%). A variação vem do valor, não do matiz — é assim que atmosfera real
// se comporta. Faixa larga + saturação alta é o que faz gradiente parecer
// gerado; aqui a cor é temperatura, não decoração.
//
// O fundo não reage ao ponteiro de propósito. Luz que persegue o cursor
// transforma o fundo em brinquedo e puxa atenção que pertence ao trabalho.
// Aqui a luz é fixa no cenário e os volumes é que passam por ela — quem dá
// dimensão é a incidência sobre a normal do campo, não a interação.
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
    "uniform vec3 uBg;\n" +
    "uniform float uIntensity;\n" +
    "uniform float uBlobGain;\n" +
    "uniform float uVinheta;\n" +
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
    // A luz é propriedade do cenário, não do ponteiro: fica ancorada fora do
    // quadro, no alto à esquerda, e os volumes é que passam por ela.
    "const vec2 LUZ = vec2(-0.85, 0.62);\n" +
    "\n" +
    "vec2 centro1(float t){ return vec2(-0.34, 0.12) + vec2(sin(t * 0.15), cos(t * 0.12) * 0.7) * 0.34; }\n" +
    "vec2 centro2(float t){ return vec2(0.36, -0.14) + vec2(cos(t * 0.11), sin(t * 0.17) * 0.8) * 0.32; }\n" +
    "vec2 centro3(float t){ return vec2(0.0, 0.3) + vec2(sin(t * 0.09 + 2.0), cos(t * 0.14 + 1.0)) * 0.36; }\n" +
    "\n" +
    // Extraído para função porque a normal do volume sai do gradiente deste
    // campo — precisa ser amostrado nos vizinhos, não só no fragmento atual.
    "float campo(vec2 p, float t){\n" +
    "  float k = 0.45;\n" +
    "  float a = sdCircle(p, centro1(t), 0.5);\n" +
    "  float b = sdCircle(p, centro2(t), 0.42);\n" +
    "  float c = sdCircle(p, centro3(t), 0.46);\n" +
    "  return smin(smin(a, b, k), c, k);\n" +
    "}\n" +
    "\n" +
    "void main(){\n" +
    "  vec2 uv = gl_FragCoord.xy / uResolution;\n" +
    "  float scale = min(uResolution.x, uResolution.y);\n" +
    "  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / scale;\n" +
    "  float t = uTime;\n" +
    "\n" +
    "  float d1 = sdCircle(p, centro1(t), 0.5);\n" +
    "  float d2 = sdCircle(p, centro2(t), 0.42);\n" +
    "  float d3 = sdCircle(p, centro3(t), 0.46);\n" +
    "\n" +
    "  float d = campo(p, t);\n" +
    "  float field = smoothstep(0.4, -0.3, d);\n" +
    "\n" +
    "  float i1 = pow(smoothstep(0.85, -0.15, d1), 2.5);\n" +
    "  float i2 = pow(smoothstep(0.85, -0.15, d2), 2.5);\n" +
    "  float i3 = pow(smoothstep(0.85, -0.15, d3), 2.5);\n" +
    "\n" +
    // Estas três são a cor do volume na sombra. O glacial saiu daqui: virou a
    // cor da luz, aplicada por incidência — não é mais um blob entre iguais.
    "  vec3 ardosia = vec3(0.443, 0.416, 0.627);\n" +
    "  vec3 aco     = vec3(0.341, 0.478, 0.580);\n" +
    "  vec3 breu    = vec3(0.290, 0.333, 0.439);\n" +
    "\n" +
    // Pesos desiguais: sem eles os três volumes disputam em igualdade e a
    // mistura achata para um cinza médio. Ardósia manda, aço apoia.
    "  float w1 = i1 * 1.00;\n" +
    "  float w2 = i2 * 0.80;\n" +
    "  float w3 = i3 * 0.62;\n" +
    "  float wsum = max(w1 + w2 + w3, 0.0001);\n" +
    "  vec3 base = (ardosia * w1 + aco * w2 + breu * w3) / wsum;\n" +
    "\n" +
    // Normal por diferenças finitas. O gradiente de um SDF aponta para fora da
    // superfície, então dot(n, direção da luz) já é a incidência.
    // Epsilon largo de propósito: com passo curto a normal capta a costura do
    // smin entre os volumes e a luz desenha uma dobra dura ali. Aqui interessa
    // a forma ampla da névoa, não o detalhe da superfície.
    "  float e = 0.014;\n" +
    "  vec2 grad = vec2(\n" +
    "    campo(p + vec2(e, 0.0), t) - campo(p - vec2(e, 0.0), t),\n" +
    "    campo(p + vec2(0.0, e), t) - campo(p - vec2(0.0, e), t)\n" +
    "  );\n" +
    "  float glen = length(grad);\n" +
    "  vec2 n = glen > 0.0001 ? grad / glen : vec2(0.0, 1.0);\n" +
    "\n" +
    "  vec2 paraLuz = LUZ - p;\n" +
    // Curva suave na faixa inteira: um remap apertado (0.12–0.92) transforma
    // variação de gradiente em banda visível.
    "  float incid = smoothstep(0.0, 1.0, dot(n, normalize(paraLuz)) * 0.5 + 0.5);\n" +
    // Queda com a distância: volume longe da luz permanece na sombra. Sem isso
    // a face voltada para a luz acende igual em qualquer canto e achata de novo.
    "  float queda = 1.0 - smoothstep(0.7, 2.3, length(paraLuz));\n" +
    "\n" +
    "  vec3 glacial = vec3(0.612, 0.682, 0.706);\n" +
    "  vec3 blobColor = mix(base, glacial, incid * queda * 0.7) * uBlobGain;\n" +
    "  vec3 color = mix(uBg, blobColor, field * uIntensity);\n" +
    "\n" +
    "  float g = hash(gl_FragCoord.xy + t * 57.0);\n" +
    // O grain era 0.1 contra cor saturada. Com a paleta dessaturada ele passa a
    // competir com a própria cor, então baixa — e ganha viés frio para não sujar.
    "  color += (g - 0.5) * vec3(0.048, 0.054, 0.062);\n" +
    "\n" +
    "  float vig = smoothstep(1.1, 0.4, length(uv - 0.5) * 1.55);\n" +
    "  color *= mix(uVinheta, 1.0, vig);\n" +
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
  var uBg = gl.getUniformLocation(program, "uBg");
  var uIntensity = gl.getUniformLocation(program, "uIntensity");
  var uBlobGain = gl.getUniformLocation(program, "uBlobGain");
  var uVinheta = gl.getUniformLocation(program, "uVinheta");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 1.5);

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
  var blobGain = 0.5;
  var vinheta = 0.82;

  function readTheme() {
    var raiz = document.documentElement;
    var explicito = raiz.getAttribute("data-theme");
    var claro = explicito ? explicito === "light" : window.matchMedia("(prefers-color-scheme: light)").matches;
    var hex = getComputedStyle(raiz).getPropertyValue("--fundo") || (claro ? "#f6f6fb" : "#0b0f1a");
    bgColor = hexToRgb01(hex);
    // A paleta fria tem luminância bem mais baixa que a antiga. No escuro isso
    // só pede um pouco mais de ganho. No claro inverte o problema: com ganho
    // baixo os blobs escurecem o branco em vez de tingir. Daí ganho alto (ergue
    // a cor até perto do fundo) com mistura baixa (deixa só o matiz passar).
    intensity = claro ? 0.35 : 0.85;
    // O tom de sombra entrou no lugar do glacial na mistura base, então o
    // escuro precisa de um pouco mais de ganho para não perder presença.
    blobGain = claro ? 1.5 : 0.58;
    // Vinheta a 82% sobre fundo claro recorta o canvas como um retângulo cinza
    // contra o resto da página; no claro ela precisa ser quase imperceptível.
    vinheta = claro ? 0.965 : 0.82;
  }

  readTheme();

  var temaToggle = document.getElementById("tema-toggle");
  if (temaToggle) {
    temaToggle.addEventListener("click", function () {
      setTimeout(readTheme, 0);
    });
  }
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", readTheme);

  window.addEventListener("resize", resize);
  resize();

  var start = performance.now();

  function frame(now) {
    var t = reduceMotion ? 0 : (now - start) / 1000;

    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform3f(uBg, bgColor[0], bgColor[1], bgColor[2]);
    gl.uniform1f(uIntensity, intensity);
    gl.uniform1f(uBlobGain, blobGain);
    gl.uniform1f(uVinheta, vinheta);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
