// Kit is drawn as one instanced mesh of blocks. Everything that moves is
// computed here from a handful of uniforms, so the CPU never loops over blocks.
//
// Timeline, per block:
//   intro   one small grey block grows into a big block, then every block
//           flows to its place in Kit, bottom first
//   check   a scan line sweeps up; a block earns its colour when the line
//           passes it (linear, like a scanner), with a short pop
//   break   blocks near the hit fly out grey, come back, and are re-checked
//           by a local scan

export const vertexShader = /* glsl */ `
precision highp float;

uniform float uTime;
uniform float uIntro;          // seconds since the intro started (large = done)
uniform vec3  uScan;           // global check: start time, start y, speed (units/s)
uniform mat4  uPart[8];        // idle pose per body part
uniform vec4  uBreak[4];       // centre (xyz) + start time (w)
uniform vec3  uBreakScan[4];   // local check per break: start time, start y, speed
uniform float uBreakR;
uniform float uReduced;        // 1 = no displacement, colour changes only
uniform vec3  uCube;           // centre of the starting block
uniform vec3  uGrey;

attribute vec3 aHome;
attribute vec3 aStart;
attribute vec3 aColor;
attribute vec2 aMeta;          // x = part id, y = height order (0 bottom, 1 top)
attribute vec4 aSeed;

varying vec3 vColor;
varying vec3 vNormal;
varying vec2 vUv;

const float PI = 3.14159265;

float easeIO(float t) {
  t = clamp(t, 0.0, 1.0);
  return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 5.0) / 2.0;
}
float easeO(float t) { t = clamp(t, 0.0, 1.0); return 1.0 - pow(1.0 - t, 4.0); }

mat3 rotAxis(vec3 axis, float a) {
  axis = normalize(axis);
  float s = sin(a), c = cos(a), oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,          oc * axis.x * axis.y + axis.z * s, oc * axis.z * axis.x - axis.y * s,
    oc * axis.x * axis.y - axis.z * s, oc * axis.y * axis.y + c,          oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.x + axis.y * s, oc * axis.y * axis.z - axis.x * s, oc * axis.z * axis.z + c
  );
}

// time at which a scan (start, y0, speed) reaches height y
float passTime(vec3 scan, float y) { return scan.x + max(0.0, y - scan.y) / scan.z; }

void main() {
  int part = int(aMeta.x + 0.5);
  mat4 P = uPart[part];
  vec3 target = (P * vec4(aHome, 1.0)).xyz;

  // ---- intro
  float grow = easeIO((uIntro - 0.25) / 0.45);
  float k = easeIO((uIntro - 0.55 - aMeta.y * 0.55 - aSeed.w * 0.08) / 0.8);
  float kk = 0.16 + 0.84 * grow;
  vec3 pos = mix(mix(uCube, aStart, kk), target, k);
  pos.y += sin(PI * k) * 1.2;
  float scale = kk;

  // ---- global check
  float tPass = passTime(uScan, aHome.y);
  float grey = uTime < tPass ? 1.0 : 0.0;
  float popT = uTime - tPass;

  // ---- breaks
  vec3 disp = vec3(0.0);
  float spin = 0.0;
  for (int i = 0; i < 4; i++) {
    vec4 b = uBreak[i];
    float bt = uTime - b.w;
    if (bt < 0.0 || bt > 3.2) continue;
    float d = distance(aHome, b.xyz);
    if (d > uBreakR) continue;
    float w = 1.0 - d / uBreakR;
    float outK = easeO(bt / 0.42);
    float backK = easeIO((bt - 0.72 - w * 0.35 - aSeed.z * 0.12) / 0.7);
    float amt = outK * (1.0 - backK) * (1.0 - uReduced);
    vec3 dir = normalize(aHome - b.xyz + (aSeed.xyz - 0.5) * 1.8 + vec3(0.0, 0.35, 0.6));
    disp += dir * amt * (2.6 + 5.0 * aSeed.x) * (0.45 + 0.55 * w);
    spin += amt * (1.5 + 3.0 * aSeed.y);
    float tp = passTime(uBreakScan[i], aHome.y);
    if (uTime < tp) grey = 1.0; else popT = min(popT, uTime - tp);
  }

  float pop = 1.0 + 0.16 * sin(PI * clamp(popT / 0.18, 0.0, 1.0));
  mat3 R = rotAxis(aSeed.zxy * 2.0 - 1.0 + vec3(0.001, 0.002, 0.003), spin);
  mat3 PR = mat3(P);
  vec3 local = PR * (R * (position * scale * pop));
  vec3 world = pos + disp + local;

  vNormal = normalize(PR * (R * normal));
  vUv = uv;
  vColor = mix(aColor, uGrey, grey);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform float uGrout;     // 0..1 darkening of block edges
uniform float uGroutPx;   // edge width in pixels

varying vec3 vColor;
varying vec3 vNormal;
varying vec2 vUv;

void main() {
  // flat, directional shading baked per face: top brightest, no gloss
  vec3 n = normalize(vNormal);
  float s = 0.72
    + 0.28 * max(n.y, 0.0)
    - 0.17 * max(-n.y, 0.0)
    + 0.18 * max(n.z, 0.0)
    + 0.08 * max(n.x, 0.0)
    - 0.02 * max(-n.x, 0.0);
  // hard, one-pixel grout between blocks so Kit reads as built from blocks
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = min(e.x, e.y);
  float px = fwidth(edge);
  float g = smoothstep(uGroutPx * px - px * 0.5, uGroutPx * px + px * 0.5, edge);
  vec3 c = vColor * s * mix(1.0 - uGrout, 1.0, g);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;
