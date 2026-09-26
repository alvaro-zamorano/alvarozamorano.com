// "How I build": Kit is taken apart and rebuilt the way the method says.
// Everything is a pure function of the scroll progress uP (0..4, one unit per
// step), so scrolling back plays the story backwards.
//
//   step 1  define done     blocks leave Kit, top first, and fly to three
//                           agents; the mould (Kit's shape, drawn as lines) stays
//   step 2  agents work     the agents place grey blocks, bottom first
//   step 3  check           a scan line sweeps up and blocks earn their colour;
//                           one ear fails, goes back and is redone
//   step 4  human           the tail tip waits in the air until a person approves
//
// Times are in steps (uP units) unless a uniform says otherwise.

export const T = {
  d1a: 0.08, // step 1: first block leaves Kit
  d1b: 0.8, // step 1: last block leaves Kit
  f1: 0.12, // flight to an agent
  d2a: 1.06, // step 2: first block placed
  d2b: 1.8, // step 2: last block placed (and the tip is handed over)
  f2: 0.14, // flight from an agent
  s0: 2.04, // step 3: check starts at the feet
  s1: 2.48, // step 3: check reaches the ears
  // failed blocks, relative to the moment the check clears them
  ej0: 0.03, // start flying back to their agent
  ej: 0.07,
  rd0: 0.12, // redone blocks start coming back
  rd: 0.1,
  rs0: 0.22, // local re-check starts
  rs: 0.06,
};

const f = (v: number) => v.toFixed(4);

export const blockVertex = /* glsl */ `
precision highp float;

uniform float uP;
uniform mat4  uPart[8];      // idle pose per body part (identity while building)
uniform vec3  uGrey;
uniform vec3  uFlash;        // a block that failed the check
uniform vec4  uScan;         // check: start, end (steps), from y, to y
uniform vec4  uFail;         // time the check clears the failed cluster, its y range
uniform vec3  uFailAgent;    // where the failed blocks go and come back from
uniform vec3  uTipHover;     // where the tail tip waits, relative to its place
uniform float uBob;          // the waiting tip bobs a little
uniform float uDrop;         // 0..1 tip drops into place (seconds-driven)
uniform float uTipScan;      // 0..1 local check of the tip
uniform vec2  uTipY;         // tip y range

attribute vec3 aHome;
attribute vec4 aMeta;        // part, order (0 bottom .. 1 top), kind (0 block, 1 tip, 2 fails), unused
attribute vec3 aColor;
attribute vec4 aSeed;
attribute vec3 aUp;          // the agent the block flies to in step 1
attribute vec3 aDown;        // the agent that places the block in step 2

varying vec3 vColor;
varying vec3 vNormal;
varying vec2 vUv;

const float PI = 3.14159265;
const float D1A = ${f(T.d1a)}, D1B = ${f(T.d1b)}, F1 = ${f(T.f1)};
const float D2A = ${f(T.d2a)}, D2B = ${f(T.d2b)}, F2 = ${f(T.f2)};
const float EJ0 = ${f(T.ej0)}, EJ = ${f(T.ej)}, RD0 = ${f(T.rd0)}, RD = ${f(T.rd)};
const float RS0 = ${f(T.rs0)}, RS = ${f(T.rs)};

float c01(float t) { return clamp(t, 0.0, 1.0); }
float easeIn(float t) { t = c01(t); return t * t * t; }
float easeOut(float t) { t = c01(t); return 1.0 - pow(1.0 - t, 3.0); }
float easeIO(float t) {
  t = c01(t);
  return t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 5.0) / 2.0;
}

void main() {
  int part = int(aMeta.x + 0.5);
  float order = aMeta.y;
  bool isTip = aMeta.z > 0.5 && aMeta.z < 1.5;
  bool isFail = aMeta.z > 1.5;
  mat4 P = uPart[part];
  vec3 home = (P * vec4(aHome, 1.0)).xyz;

  vec3 pos = home;
  float scale = 1.0;
  bool checked = true;
  bool flash = false;
  float popT = 1.0; // steps since this block was checked

  if (uP < 1.0) {
    // step 1: leave Kit, top first, and fly to the agent
    float d1 = mix(D1A, D1B, 1.0 - order);
    if (uP >= d1) {
      float k = c01((uP - d1) / F1);
      checked = false;
      pos = mix(home, aUp, easeIn(k));
      pos.y += sin(PI * k) * (1.0 + 2.0 * aSeed.x);
      scale = k >= 1.0 ? 0.0 : mix(1.0, 0.3, k);
    }
  } else {
    // step 2: an agent places the block, bottom first; the tip is handed over last
    float d2 = isTip ? D2B : mix(D2A, D2B, order);
    float k = c01((uP - d2) / F2);
    vec3 dest = home;
    if (isTip) dest = mix(aHome + uTipHover + vec3(0.0, uBob, 0.0), home, easeIO(uDrop));
    float e = easeOut(k);
    pos = mix(aDown, dest, e);
    pos.y += sin(PI * k) * (0.8 + 1.6 * aSeed.y);
    scale = k <= 0.0 ? 0.0 : mix(0.3, 1.0, e);

    // step 3: the check sweeps up
    float tPass = mix(uScan.x, uScan.y, c01((aHome.y - uScan.z) / (uScan.w - uScan.z)));
    checked = uP >= tPass;
    popT = uP - tPass;

    if (isFail) {
      float tf = uFail.x;
      if (checked && uP < tf + EJ0) flash = true;
      float rd = c01((uP - (tf + RD0)) / RD);
      if (uP >= tf + EJ0 && rd <= 0.0) {
        float ej = c01((uP - (tf + EJ0)) / EJ);
        pos = mix(home, uFailAgent, easeIn(ej));
        scale = ej >= 1.0 ? 0.0 : mix(1.0, 0.3, ej);
        checked = false;
        flash = ej < 0.6;
      } else if (rd > 0.0) {
        float er = easeOut(rd);
        pos = mix(uFailAgent, home, er);
        scale = mix(0.3, 1.0, er);
        float tr = tf + RS0 + RS * c01((aHome.y - uFail.y) / max(0.5, uFail.z - uFail.y));
        checked = uP >= tr;
        popT = uP - tr;
      }
    }

    if (isTip) {
      // step 4: checked only after a person approves it and it lands
      float fy = c01((aHome.y - uTipY.x) / max(0.5, uTipY.y - uTipY.x));
      checked = uDrop >= 1.0 && uTipScan >= fy;
      popT = (uTipScan - fy) * 0.12;
    }
  }

  float pop = 1.0 + 0.14 * sin(PI * c01(popT / 0.03));
  mat3 PR = mat3(P);
  vec3 world = pos + PR * (position * scale * pop);

  vNormal = normalize(PR * normal);
  vUv = uv;
  vColor = flash ? uFlash : (checked ? aColor : uGrey);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`;

// The mould: Kit's outer blocks drawn as lines, a touch smaller than a block, so a
// placed block hides it and an empty slot shows it.
export const mouldVertex = /* glsl */ `
precision highp float;
attribute vec3 aHome;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(aHome + position * 0.93, 1.0);
}
`;

export const mouldFragment = /* glsl */ `
precision highp float;
uniform vec3 uFace;
uniform vec3 uLine;
uniform float uLinePx;
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = min(e.x, e.y);
  float px = fwidth(edge);
  float line = 1.0 - smoothstep(uLinePx * px - px * 0.5, uLinePx * px + px * 0.5, edge);
  // faces a hair lighter on top so the mould keeps its volume
  float s = 1.0 + 0.25 * max(normalize(vNormal).y, 0.0);
  gl_FragColor = vec4(mix(uFace * s, uLine, line), 1.0);
  #include <colorspace_fragment>
}
`;

// The three agents: plain cream blocks placed from the CPU.
export const agentVertex = /* glsl */ `
precision highp float;
uniform vec4 uAgents[3];     // xyz position, w size
uniform vec3 uAgentColor;
attribute float aIdx;
varying vec3 vColor;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
  vec4 a = uAgents[int(aIdx + 0.5)];
  vNormal = normal;
  vUv = uv;
  vColor = uAgentColor;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(a.xyz + position * a.w, 1.0);
}
`;
