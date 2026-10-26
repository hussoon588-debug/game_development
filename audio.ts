"use client";

type SoundKind = "tap" | "coin" | "build" | "rent" | "bank" | "error" | "success";

type Ctx = AudioContext & { resume: () => Promise<void> };

/**
 * محرك صوت واقعي بالكامل مُولَّد داخل المتصفح (موج، ريح، طيور، سيارات بعيدة)
 * بدون أي ملفات صوتية خارجية — خفيف على الجوال ويعمل حتى بدون إنترنت.
 */
class CityAudio {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  private volume = 0.55;
  running = false;

  private ensure(): Ctx | null {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor() as Ctx;
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private noiseBuffer(ctx: Ctx, seconds = 3): AudioBuffer {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < channel.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      channel[i] = last * 3.2;
    }
    return buffer;
  }

  start(): boolean {
    const ctx = this.ensure();
    if (!ctx) return false;
    if (this.running) return true;
    this.running = true;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.9;
    this.ambientGain.connect(this.master);

    // نسيم البحر والريح الصحراوية
    const noise = this.noiseBuffer(ctx);
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 430;
    windFilter.Q.value = 0.7;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.075;
    wind.connect(windFilter).connect(windGain).connect(this.ambientGain);
    wind.start();
    this.sources.push(wind);

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.032;
    lfo.connect(lfoGain).connect(windGain.gain);
    lfo.start();
    this.sources.push(lfo);

    // أمواج البحر
    const waves = ctx.createBufferSource();
    waves.buffer = noise;
    waves.loop = true;
    waves.playbackRate.value = 0.8;
    const waveFilter = ctx.createBiquadFilter();
    waveFilter.type = "bandpass";
    waveFilter.frequency.value = 520;
    waveFilter.Q.value = 0.6;
    const waveGain = ctx.createGain();
    waveGain.gain.value = 0.05;
    waves.connect(waveFilter).connect(waveGain).connect(this.ambientGain);
    waves.start();
    this.sources.push(waves);

    const swell = ctx.createOscillator();
    swell.frequency.value = 0.085;
    const swellGain = ctx.createGain();
    swellGain.gain.value = 0.038;
    swell.connect(swellGain).connect(waveGain.gain);
    swell.start();
    this.sources.push(swell);

    this.scheduleBirds();
    this.scheduleCars();
    return true;
  }

  private scheduleBirds() {
    const tick = () => {
      if (!this.running) return;
      this.chirp();
      this.timers.push(window.setTimeout(tick, 5200 + Math.random() * 9000));
    };
    this.timers.push(window.setTimeout(tick, 2600));
  }

  private scheduleCars() {
    const tick = () => {
      if (!this.running) return;
      this.passBy();
      this.timers.push(window.setTimeout(tick, 7000 + Math.random() * 12000));
    };
    this.timers.push(window.setTimeout(tick, 4200));
  }

  private chirp() {
    const ctx = this.ctx;
    if (!ctx || !this.ambientGain) return;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i += 1) {
      const start = ctx.currentTime + i * 0.12 + Math.random() * 0.04;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const base = 2100 + Math.random() * 1400;
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, start + 0.07);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.022, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
      osc.connect(gain).connect(this.ambientGain);
      osc.start(start);
      osc.stop(start + 0.14);
    }
  }

  private passBy() {
    const ctx = this.ctx;
    if (!ctx || !this.ambientGain) return;
    const start = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 1.4);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(700, start);
    filter.frequency.linearRampToValueAtTime(1250, start + 0.9);
    filter.Q.value = 1.1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.02, start + 0.45);
    gain.gain.linearRampToValueAtTime(0.0001, start + 1.5);
    src.connect(filter).connect(gain).connect(this.ambientGain);
    src.start(start);
    src.stop(start + 1.6);
  }

  private tone(freq: number, duration: number, type: OscillatorType, gainValue = 0.08, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private burst(duration: number, frequency: number, gainValue = 0.07, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(ctx, 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(start);
    src.stop(start + duration + 0.02);
  }

  play(kind: SoundKind) {
    if (!this.running) {
      const started = this.start();
      if (!started) return;
    }
    const ctx = this.ensure();
    if (!ctx) return;
    if (kind === "tap") {
      this.tone(880, 0.08, "triangle", 0.04);
      return;
    }
    if (kind === "coin") {
      this.tone(1180, 0.1, "triangle", 0.07);
      this.tone(1580, 0.16, "triangle", 0.06, 0.08);
      this.burst(0.12, 5200, 0.03);
      return;
    }
    if (kind === "build") {
      this.burst(0.16, 900, 0.1);
      this.tone(120, 0.18, "sine", 0.09);
      this.burst(0.14, 740, 0.08, 0.18);
      this.tone(98, 0.2, "sine", 0.08, 0.18);
      this.burst(0.12, 1100, 0.06, 0.36);
      return;
    }
    if (kind === "rent") {
      this.tone(1420, 0.12, "sine", 0.06);
      this.tone(1860, 0.2, "sine", 0.05, 0.1);
      this.burst(0.1, 3600, 0.03, 0.02);
      return;
    }
    if (kind === "bank") {
      this.tone(740, 0.16, "sine", 0.07);
      this.tone(1108, 0.22, "sine", 0.06, 0.14);
      this.tone(1480, 0.24, "sine", 0.04, 0.28);
      return;
    }
    if (kind === "success") {
      this.tone(660, 0.14, "sine", 0.06);
      this.tone(990, 0.2, "sine", 0.05, 0.12);
      return;
    }
    this.tone(260, 0.18, "sawtooth", 0.055);
    this.tone(180, 0.24, "sawtooth", 0.05, 0.12);
  }

  setVolume(value: number) {
    this.volume = Math.min(1, Math.max(0, value));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    }
  }

  stop() {
    this.running = false;
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // already stopped
      }
    });
    this.sources = [];
    if (this.master && this.ctx) {
      try {
        this.master.disconnect();
      } catch {
        // ignore
      }
    }
    this.master = null;
    this.ambientGain = null;
  }
}

export const cityAudio = new CityAudio();

export function playSound(kind: SoundKind) {
  try {
    cityAudio.play(kind);
  } catch {
    // الصوت اختياري ولا يجب أن يكسر التجربة
  }
}

export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // لا اهتزاز على هذا الجهاز
  }
}

export function feedback(kind: SoundKind, hapticsEnabled: boolean, pattern: number | number[] = 12) {
  playSound(kind);
  if (hapticsEnabled) haptic(pattern);
}
