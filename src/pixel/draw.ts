import { glyph, textWidth } from "./font";

// Pixel primitives on a fixed low-res canvas. Every call lands on whole pixels.
export class Px {
  constructor(public c: CanvasRenderingContext2D, public fg: string, public bg: string) {}
  dot(x: number, y: number, on = true) { this.c.fillStyle = on ? this.fg : this.bg; this.c.fillRect(x | 0, y | 0, 1, 1); }
  rect(x: number, y: number, w: number, h: number, on = true) { this.c.fillStyle = on ? this.fg : this.bg; this.c.fillRect(x | 0, y | 0, w | 0, h | 0); }
  box(x: number, y: number, w: number, h: number, dotted = false) {
    for (let i = 0; i < w; i++) if (!dotted || i % 2 === 0) { this.dot(x + i, y); this.dot(x + i, y + h - 1); }
    for (let j = 0; j < h; j++) if (!dotted || j % 2 === 0) { this.dot(x, y + j); this.dot(x + w - 1, y + j); }
  }
  text(s: string, x: number, y: number, on = true, scale = 1) {
    this.c.fillStyle = on ? this.fg : this.bg;
    [...s].forEach((ch, i) => { const g = glyph(ch); for (let k = 0; k < 15; k++) if (g[k] === "1") this.c.fillRect(x + (i * 4 + (k % 3)) * scale, y + Math.floor(k / 3) * scale, scale, scale); });
  }
  textC(s: string, cx: number, y: number, on = true) { this.text(s, Math.round(cx - textWidth(s) / 2), y, on); }
  line(x0: number, y0: number, x1: number, y1: number, dotted = false) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
    for (;;) { if (!dotted || n++ % 2 === 0) this.dot(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  circle(cx: number, cy: number, r: number) {
    let x = r, y = 0, e = 1 - r;
    while (x >= y) { for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) this.dot(cx + a, cy + b); y++; if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; } }
  }
  knob(cx: number, cy: number, f: number, r = 6) {
    this.circle(cx, cy, r); const a = (-135 + f * 270) * Math.PI / 180;
    this.line(cx, cy, cx + (r - 1) * Math.sin(a), cy - (r - 1) * Math.cos(a));
  }
  fader(x: number, y: number, w: number, h: number, f: number) {
    this.box(x, y, w, h); const segs = Math.floor((h - 2) / 2), lit = Math.round(f * segs);
    for (let i = 0; i < lit; i++) this.rect(x + 2, y + h - 3 - i * 2, w - 4, 1);
  }
  invert(x: number, y: number, w: number, h: number) { this.rect(x, y, w, h); }
}
