// WebGL2 full-screen renderer for SPACE and PLASMA. Programs are compiled per option combination and cached.
import { HEAD, TAIL, SPACE_SOURCES, PLASMA_SOURCES, SURFACE_FORMS, SKIN_PAL } from "./shaders";
import type { SceneOpts } from "./options";

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

export type Bands = { kick: number; snare: number; bass: number; level: number };
type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

/** Build the define header + body for a world/options combination (pure, testable). */
export function sceneSource(world: "SPACE" | "PLASMA", o: SceneOpts) {
  if (world === "SPACE") {
    const body = SPACE_SOURCES[o.ground].replace("SKIN_SRC", `${SKIN_PAL}\n${SURFACE_FORMS}`);
    return { key: `S${o.ground}.${o.object}.${o.motion}.${o.cam}`, src: `${HEAD}#define OBJ ${o.object}\n#define MOTION ${o.motion}\n#define CAM ${o.cam}\n${body}${TAIL}` };
  }
  return { key: `P${o.form}`, src: `${HEAD}${PLASMA_SOURCES[o.form]}${TAIL}` };
}

export class GlScene {
  private gl: WebGL2RenderingContext | null;
  private progs = new Map<string, Prog | null>();
  private tex: WebGLTexture | null = null;
  private lost = false;
  scale = .5; private slow = 0; private fast = 0;
  error = "";
  constructor(readonly canvas: HTMLCanvasElement) {
    this.gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: false, powerPreference: "high-performance" });
    if (!this.gl) { this.error = "WebGL2 unavailable"; return; }
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); this.lost = true; });
    canvas.addEventListener("webglcontextrestored", () => { this.lost = false; this.progs.clear(); this.tex = null; this.init(); });
    this.init();
  }
  private init() {
    const gl = this.gl; if (!gl) return; const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    // Stand-in for Shadertoy's RGBA noise channel: seeded random texels, repeat, mipmapped.
    const N = 256, d = new Uint8Array(N * N * 4); let s = 1234567;
    for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = s >>> 24; }
    this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }
  private program(key: string, src: string): Prog | null {
    if (this.progs.has(key)) return this.progs.get(key) ?? null;
    const gl = this.gl; if (!gl) return null;
    const sh = (t: number, s: string) => { const x = gl.createShader(t); if (!x) return null; gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) { this.error = gl.getShaderInfoLog(x) || "compile"; console.error("[AV] shader", key, this.error); gl.deleteShader(x); return null; } return x; };
    const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, src);
    let out: Prog | null = null;
    if (v && f) {
      const p = gl.createProgram(); if (!p) { gl.deleteShader(v); gl.deleteShader(f); return null; } gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, "p"); gl.linkProgram(p);
      if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
        const u: Prog["u"] = {}; for (const n of ["iResolution", "iTime", "iChannel0", "uBand", "uSize", "uMono", "uFg", "uBg", "uSkin", "uFloor", "uPalette", "uEffect", "uTravel", "uRotation"]) u[n] = gl.getUniformLocation(p, n);
        out = { p, u }; this.error = "";
      } else { this.error = gl.getProgramInfoLog(p) || "link"; console.error("[AV] link", key, this.error); }
      gl.deleteShader(v); gl.deleteShader(f);
    }
    this.progs.set(key, out); return out;
  }
  render(world: "SPACE" | "PLASMA", o: SceneOpts, time: number, b: Bands, size: number, mono: boolean, fg: [number, number, number], bg: [number, number, number], dt: number, travel = time, rotation = time) {
    const gl = this.gl; if (!gl || this.lost) return;
    // Adaptive internal resolution: heavy raymarchers drop resolution rather than frame rate.
    const max = world === "PLASMA" ? 1 : .6, min = world === "PLASMA" ? .35 : .18;
    if (dt > 1 / 40) { this.fast = 0; if (++this.slow > 20) { this.scale = Math.max(min, this.scale * .85); this.slow = 0; } }
    else if (dt < 1 / 55) { this.slow = 0; if (++this.fast > 90) { this.scale = Math.min(max, this.scale * 1.1); this.fast = 0; } }
    this.scale = Math.max(min, Math.min(max, this.scale));
    const cw = this.canvas.clientWidth, ch = this.canvas.clientHeight; if (!cw || !ch) return;
    const W = Math.max(64, Math.round(cw * this.scale)), H = Math.max(36, Math.round(ch * this.scale));
    if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
    const { key, src } = sceneSource(world, o);
    const pr = this.program(key, src); if (!pr) return;
    gl.viewport(0, 0, W, H); gl.useProgram(pr.p);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    const u = pr.u;
    gl.uniform3f(u.iResolution, W, H, 1); gl.uniform1f(u.iTime, time); gl.uniform1i(u.iChannel0, 0);
    gl.uniform4f(u.uBand, b.kick, b.snare, b.bass, 0); gl.uniform1f(u.uSize, size);
    gl.uniform1i(u.uSkin, o.skin); gl.uniform1i(u.uFloor, o.floor); gl.uniform1i(u.uPalette, o.palette); gl.uniform1i(u.uEffect, o.effect);
    gl.uniform1f(u.uTravel, travel); gl.uniform1f(u.uRotation, rotation);
    gl.uniform1i(u.uMono, mono || o.palette === 6 ? 1 : 0);
    gl.uniform3f(u.uFg, ...fg); gl.uniform3f(u.uBg, ...bg);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose() { const gl = this.gl; if (!gl) return; this.progs.forEach(p => p && gl.deleteProgram(p.p)); this.progs.clear(); gl.getExtension("WEBGL_lose_context")?.loseContext(); this.gl = null; }
}
