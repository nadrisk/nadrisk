/** Gates every visual animation loop: runs only while audio is active, the tab is visible and the element is on screen. */
const listeners = new Set<() => void>();
let playing = false, recentUntil = 0, idleTimer: ReturnType<typeof setTimeout> | 0 = 0;
const IDLE_MS = 4000; // tails/meters keep moving briefly after the last hit

const notify = () => listeners.forEach(l => l());
export const audioActive = () => playing || performance.now() < recentUntil;

export function setTransportPlaying(on: boolean) { if (on !== playing) { playing = on; notify(); } }
/** Called on every pad hit so monitors wake for free play without the transport. */
export function pokeAudio() {
  const was = audioActive();
  recentUntil = performance.now() + IDLE_MS;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { idleTimer = 0; notify(); }, IDLE_MS + 20);
  if (!was) notify();
}

/** requestAnimationFrame loop that sleeps when idle, hidden or scrolled out of view. Returns cleanup. */
export function gatedLoop(el: Element | null, tick: (now: number) => void): () => void {
  let raf = 0, inView = true, dead = false;
  const frame = (now: number) => { raf = 0; if (dead) return; tick(now); sync(); };
  const want = () => !dead && inView && !document.hidden && audioActive();
  const sync = () => { if (want()) { if (!raf) raf = requestAnimationFrame(frame); } else if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  const io = el && "IntersectionObserver" in window ? new IntersectionObserver(es => { inView = es.some(e => e.isIntersecting); sync(); }) : null;
  if (io && el) io.observe(el);
  listeners.add(sync); document.addEventListener("visibilitychange", sync);
  // Draw one frame immediately so idle screens show their resting state.
  raf = requestAnimationFrame(frame);
  return () => { dead = true; if (raf) cancelAnimationFrame(raf); io?.disconnect(); listeners.delete(sync); document.removeEventListener("visibilitychange", sync); };
}
