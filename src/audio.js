"use strict";

// Procedural sound effects via Web Audio. No audio files needed.
window.audioEngine = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  muted: false,

  ensure() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) {
      return null;
    }

    if (!this.ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);

      const length = Math.floor(this.ctx.sampleRate * 1);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  },

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      this.master.gain.value = this.muted ? 0 : 0.55;
    }
    return this.muted;
  },

  tone({ freq, endFreq, type = "sine", duration = 0.15, vol = 0.2, delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) {
      return;
    }

    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t0);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.03);
  },

  noise({ duration = 0.15, vol = 0.15, filterFreq = 1200, filterEnd, filterType = "lowpass", delay = 0 }) {
    const ctx = this.ensure();
    if (!ctx || this.muted) {
      return;
    }

    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(Math.max(20, filterFreq), t0);
    if (filterEnd) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, filterEnd), t0 + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.03);
  },
};

window.sfx = {
  shoot(stage = 0) {
    audioEngine.tone({ freq: 620 + stage * 55, endFreq: 150, type: "square", duration: 0.07, vol: 0.04 });
    audioEngine.noise({ duration: 0.05, vol: 0.018, filterFreq: 2600, filterEnd: 600 });
  },
  enemyShoot() {
    audioEngine.tone({ freq: 300, endFreq: 110, type: "sawtooth", duration: 0.09, vol: 0.018 });
  },
  hit() {
    audioEngine.noise({ duration: 0.07, vol: 0.05, filterFreq: 900, filterEnd: 250 });
    audioEngine.tone({ freq: 220, endFreq: 120, type: "triangle", duration: 0.06, vol: 0.05 });
  },
  headshot() {
    this.hit();
    audioEngine.tone({ freq: 1180, endFreq: 860, type: "sine", duration: 0.09, vol: 0.07 });
  },
  meleeHit() {
    audioEngine.noise({ duration: 0.1, vol: 0.09, filterFreq: 700, filterEnd: 150 });
    audioEngine.tone({ freq: 150, endFreq: 65, type: "square", duration: 0.1, vol: 0.08 });
  },
  enemyDeath(big = false) {
    audioEngine.noise({ duration: big ? 0.5 : 0.3, vol: big ? 0.15 : 0.1, filterFreq: 2400, filterEnd: 120 });
    audioEngine.tone({ freq: big ? 200 : 260, endFreq: 48, type: "sawtooth", duration: big ? 0.42 : 0.26, vol: 0.08 });
  },
  playerHurt() {
    audioEngine.tone({ freq: 190, endFreq: 65, type: "sawtooth", duration: 0.22, vol: 0.11 });
    audioEngine.noise({ duration: 0.18, vol: 0.06, filterFreq: 600, filterEnd: 150 });
  },
  jump() {
    audioEngine.tone({ freq: 330, endFreq: 620, type: "triangle", duration: 0.11, vol: 0.045 });
  },
  dash() {
    audioEngine.noise({ duration: 0.16, vol: 0.06, filterFreq: 1600, filterEnd: 380, filterType: "bandpass" });
  },
  boostKick() {
    audioEngine.noise({ duration: 0.22, vol: 0.07, filterFreq: 480, filterEnd: 1900 });
    audioEngine.tone({ freq: 170, endFreq: 430, type: "triangle", duration: 0.18, vol: 0.045 });
  },
  shockwave() {
    audioEngine.tone({ freq: 120, endFreq: 32, type: "sine", duration: 0.34, vol: 0.2 });
    audioEngine.noise({ duration: 0.3, vol: 0.11, filterFreq: 900, filterEnd: 80 });
  },
  pickup() {
    audioEngine.tone({ freq: 660, type: "sine", duration: 0.09, vol: 0.075 });
    audioEngine.tone({ freq: 990, type: "sine", duration: 0.12, vol: 0.075, delay: 0.07 });
  },
  heal() {
    audioEngine.tone({ freq: 520, type: "sine", duration: 0.1, vol: 0.07 });
    audioEngine.tone({ freq: 780, type: "sine", duration: 0.14, vol: 0.07, delay: 0.08 });
  },
  evolve() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      audioEngine.tone({ freq, type: "triangle", duration: 0.16, vol: 0.085, delay: i * 0.07 });
    });
  },
  unlock() {
    [392, 523, 659, 880].forEach((freq, i) => {
      audioEngine.tone({ freq, type: "sine", duration: 0.18, vol: 0.085, delay: i * 0.08 });
    });
  },
  gameOver() {
    [330, 262, 196, 131].forEach((freq, i) => {
      audioEngine.tone({ freq, type: "triangle", duration: 0.42, vol: 0.1, delay: i * 0.18 });
    });
  },
  start() {
    [262, 392, 523].forEach((freq, i) => {
      audioEngine.tone({ freq, type: "triangle", duration: 0.14, vol: 0.08, delay: i * 0.06 });
    });
  },
};

// M toggles mute
document.addEventListener("keydown", (event) => {
  if (event.key === "m" || event.key === "M") {
    audioEngine.toggleMute();
  }
});
