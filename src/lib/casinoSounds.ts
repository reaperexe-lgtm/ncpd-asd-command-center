// Synthesized casino sounds using Web Audio API

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function playSpinSound(volume: number) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Rapid clicking/ticking like a slot reel
    for (let i = 0; i < 12; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Rising pitch clicks
      osc.type = "square";
      osc.frequency.setValueAtTime(800 + i * 120, now + i * 0.06);

      gain.gain.setValueAtTime(0, now + i * 0.06);
      gain.gain.linearRampToValueAtTime(volume * 0.15, now + i * 0.06 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.04);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.05);
    }

    // Whoosh sweep underneath
    const sweep = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    const sweepFilter = ctx.createBiquadFilter();
    sweep.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(ctx.destination);

    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(200, now);
    sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.7);

    sweepFilter.type = "lowpass";
    sweepFilter.frequency.setValueAtTime(400, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(2000, now + 0.7);

    sweepGain.gain.setValueAtTime(volume * 0.08, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    sweep.start(now);
    sweep.stop(now + 0.85);
  } catch {}
}

export function playJackpotSound(volume: number) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Triumphant ascending fanfare
    const notes = [523, 659, 784, 1047, 1319, 1568]; // C5 E5 G5 C6 E6 G6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      // Slight detune for richness
      osc2.type = "sawtooth";
      osc2.frequency.setValueAtTime(freq * 1.002, now + i * 0.12);

      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.12, t + 0.02);
      gain.gain.setValueAtTime(volume * 0.12, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.start(t);
      osc.stop(t + 0.28);
      osc2.start(t);
      osc2.stop(t + 0.28);
    });

    // Shimmering coin cascade
    for (let i = 0; i < 20; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "sine";
      const freq = 2000 + Math.random() * 4000;
      osc.frequency.setValueAtTime(freq, now + 0.8 + i * 0.05);

      const t = now + 0.8 + i * 0.05;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.06, t + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.1);
    }

    // Deep bass hit
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);

    bass.type = "sine";
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(40, now + 0.5);

    bassGain.gain.setValueAtTime(volume * 0.3, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    bass.start(now);
    bass.stop(now + 0.65);
  } catch {}
}

export function playWinSound(volume: number) {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Quick cheerful arpeggio
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume * 0.15, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {}
}
