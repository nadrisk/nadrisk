import type { VjPad } from "./bus";
import type { CameraStatus } from "./camera";
import { meterDb, noteName, pixelText } from "./raster";

export type CameraTelemetry = { pad?: VjPad; vel: number; bpm: number; beat: number; step: number; bank: string; running: boolean; peak: number; rms: number; size: number; theme: string; status: CameraStatus };

export function cameraHud(buf: Uint32Array, w: number, h: number, fg: number, bg: number, data: CameraTelemetry) {
  const margin = 9, chars = Math.max(8, Math.floor((w / 2 - margin * 2) / 4));
  const block = (right: boolean, bottom: boolean, rows: string[]) => {
    const blockW = Math.min(chars, Math.max(...rows.map(row => row.length))) * 4 + 1;
    const x = right ? w - margin - blockW : margin;
    const y = bottom ? h - 28 - rows.length * 9 : margin + 5;
    for (let py = y - 3; py < y + rows.length * 9; py++) for (let px = x - 3; px < x + blockW; px++) if (py >= 0 && py < h && px >= 0 && px < w) buf[py * w + px] = bg;
    rows.forEach((row, i) => pixelText(buf, w, h, x, y + i * 9, row.slice(0, chars), fg));
  };
  const pad = data.pad;
  block(false, false, [pad ? `PAD ${String(pad.index + 1).padStart(2, "0")}` : "PAD --", pad?.name || "VOICE --", pad ? `${pad.role} / ${pad.engine}` : "ENGINE --", `VEL ${Math.round(data.vel * 100)}%`]);
  block(true, false, [`${data.bpm.toFixed(1)} BPM`, `${data.running ? "PLAY" : "STOP"} ${data.bank} S${String(data.step + 1).padStart(2, "0")}`, `BAR ${String(Math.floor(data.beat / 4) + 1).padStart(2, "0")}`]);
  block(false, true, [`NAD VJ / CAM`, `SIZE ${Math.round(data.size * 100)}%`, `${data.theme === "oled" ? "1-BIT OLED" : data.theme.toUpperCase()} / ${data.status.toUpperCase()}`]);
  const db = (v: number) => v > .000001 ? `${meterDb(v).toFixed(1)} DB` : "-- DB";
  block(true, true, [`NOTE ${pad?.notes.length ? pad.notes.map(noteName).join(" ") : "--"}`, `RMS ${db(data.rms)}`, `PK ${db(data.peak)}`]);
  // Exact 1-bit viewfinder brackets, not a frame around the central image.
  for (const [x, y, dx, dy] of [[4, 4, 1, 1], [w - 5, 4, -1, 1], [4, h - 22, 1, -1], [w - 5, h - 22, -1, -1]]) {
    for (let i = 0; i < 10; i++) { buf[y * w + x + dx * i] = fg; buf[(y + dy * i) * w + x] = fg; }
  }
  const ladder = Math.round(Math.max(0, Math.min(1, (meterDb(data.peak) + 48) / 48)) * 12);
  const y = h - 29, x = w - margin - 49;
  for (let i = 0; i < 12; i++) for (let py = 0; py < 3; py++) for (let px = 0; px < 2; px++) buf[(y + py) * w + x + i * 4 + px] = i < ladder ? fg : bg;
  if (data.status !== "live") {
    const label = { off: "CAM PAUSED", opening: "OPENING CAMERA", denied: "CAMERA BLOCKED", missing: "NO CAMERA FOUND", unavailable: "CAMERA UNAVAILABLE" }[data.status];
    pixelText(buf, w, h, Math.floor((w - label.length * 4) / 2), Math.floor(h / 2), label, fg);
  }
}