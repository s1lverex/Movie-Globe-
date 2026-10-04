import { useAppStore } from '../store/useAppStore';

/**
 * Tiny WebAudio synth: ambient pad + SFX generated in code, so no audio
 * assets (and no licensing) are needed. Silent until the user unmutes.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let pad: { stop: () => void } | null = null;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
  const c = ensure();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + start);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(master);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export type Sfx = 'stamp' | 'click' | 'whoosh' | 'land';

export function playSfx(kind: Sfx): void {
  if (useAppStore.getState().muted) return;
  switch (kind) {
    case 'stamp':
      [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.08, 0.5, 'triangle', 0.15));
      break;
    case 'click':
      tone(880, 0, 0.08, 'square', 0.04);
      break;
    case 'land':
      tone(330, 0, 0.25, 'sine', 0.15);
      tone(494, 0.08, 0.3, 'sine', 0.12);
      break;
    case 'whoosh': {
      const c = ensure();
      if (!c || !master) return;
      const len = c.sampleRate * 0.8;
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((Math.PI * i) / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(400, c.currentTime);
      f.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.7);
      const g = c.createGain();
      g.gain.value = 0.12;
      src.connect(f).connect(g).connect(master);
      src.start();
      break;
    }
  }
}

function startPad() {
  const c = ensure();
  if (!c || !master || pad) return;
  const g = c.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.05, c.currentTime + 3);
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const oscs = [130.81, 196.0, 246.94, 329.63].map((f, i) => {
    const o = c.createOscillator();
    o.type = i % 2 ? 'triangle' : 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 6;
    o.connect(filter);
    o.start();
    return o;
  });
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start();
  filter.connect(g).connect(master);
  pad = {
    stop: () => {
      const now = c.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0, now + 0.6);
      [...oscs, lfo].forEach((o) => o.stop(now + 0.7));
    },
  };
}

export function setAmbient(on: boolean): void {
  if (on) startPad();
  else {
    pad?.stop();
    pad = null;
  }
}
