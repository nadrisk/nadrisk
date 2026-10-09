import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

export type WaveShape = "sine" | "triangle" | "sawtooth";
type Engine = { oscillator: Tone.Oscillator; filter: Tone.Filter; gain: Tone.Gain; analyser: Tone.Analyser };

export function useInstrument() {
  const engine = useRef<Engine | null>(null);
  const [playing, setPlaying] = useState(false);
  const [frequency, setFrequency] = useState(110);
  const [cutoff, setCutoff] = useState(1800);
  const [volume, setVolume] = useState(24);
  const [shape, setShape] = useState<WaveShape>("sine");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => { engine.current?.oscillator.frequency.rampTo(frequency, 0.06); }, [frequency]);
  useEffect(() => { engine.current?.filter.frequency.rampTo(cutoff, 0.06); }, [cutoff]);
  useEffect(() => { if (engine.current) engine.current.oscillator.type = shape; }, [shape]);
  useEffect(() => { engine.current?.gain.gain.rampTo(playing ? volume / 100 * 0.3 : 0, 0.08); }, [volume, playing]);
  useEffect(() => () => {
    const current = engine.current;
    current?.oscillator.dispose(); current?.filter.dispose(); current?.gain.dispose(); current?.analyser.dispose();
    engine.current = null;
  }, []);

  const toggle = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    try {
      await Tone.start();
      if (!engine.current) {
        const analyser = new Tone.Analyser("waveform", 1024);
        const gain = new Tone.Gain(0).toDestination();
        const filter = new Tone.Filter(cutoff, "lowpass");
        const oscillator = new Tone.Oscillator(frequency, shape);
        oscillator.chain(filter, gain); gain.connect(analyser); oscillator.start();
        engine.current = { oscillator, filter, gain, analyser };
      }
      setPlaying(value => !value); setError("");
    } catch { setError("Audio unavailable. Try another browser."); }
    finally { setStarting(false); }
  }, [starting, frequency, cutoff, shape]);

  const reset = () => { setFrequency(110); setCutoff(1800); setVolume(24); setShape("sine"); };
  const randomize = () => {
    const notes = [55, 82.41, 110, 146.83, 164.81, 220, 293.66];
    setFrequency(notes[Math.floor(Math.random() * notes.length)]);
    setCutoff(Math.round(400 + Math.random() * 4000));
    const shapes: WaveShape[] = ["sine", "triangle", "sawtooth"];
    setShape(shapes[Math.floor(Math.random() * shapes.length)]);
  };
  return { engine, playing, frequency, cutoff, volume, shape, error, starting, setFrequency, setCutoff, setVolume, setShape, toggle, reset, randomize };
}