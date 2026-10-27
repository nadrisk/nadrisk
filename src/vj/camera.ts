export type CameraStatus = "off" | "opening" | "live" | "denied" | "missing" | "unavailable";

/** No audio, uploads or recording. An obsolete permission response is stopped immediately. */
export class VjCamera {
  readonly video = document.createElement("video");
  status: CameraStatus = "off";
  private stream: MediaStream | null = null;
  private generation = 0;

  constructor(private changed: (status: CameraStatus) => void = () => {}) {
    this.video.muted = true;
    this.video.autoplay = true;
    this.video.playsInline = true;
  }

  private update(status: CameraStatus) { this.status = status; this.changed(status); }

  async start() {
    if (this.status === "live" || this.status === "opening") return;
    const generation = ++this.generation;
    if (!navigator.mediaDevices?.getUserMedia) { this.update("unavailable"); return; }
    this.update("opening");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
      if (generation !== this.generation) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (generation !== this.generation) return;
      stream.getVideoTracks().forEach(track => track.addEventListener("ended", () => {
        if (generation === this.generation) { this.stop(); this.update("unavailable"); }
      }, { once: true }));
      this.update("live");
    } catch (error) {
      if (generation !== this.generation) return;
      this.stream?.getTracks().forEach(track => track.stop());
      this.stream = null; this.video.srcObject = null;
      const name = error instanceof Error || error instanceof DOMException ? error.name : "";
      this.update(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "missing" : "unavailable");
    }
  }

  stop() {
    ++this.generation;
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null; this.video.pause(); this.video.srcObject = null;
    this.update("off");
  }
}