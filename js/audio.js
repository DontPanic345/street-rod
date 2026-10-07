let ctx = null;
let master = null;
let muted = false;

const ensure = () => {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
  return ctx;
};

export const setMuted = (value) => {
  muted = value;
  if (master) {
    master.gain.value = muted ? 0 : 0.5;
  }
};

export const isMuted = () => muted;

export const unlock = () => ensure();

const noiseBuffer = () => {
  const length = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export const createEngine = (volume = 1) => {
  if (!ensure()) {
    return { update() {}, stop() {}, screech() {} };
  }
  const out = ctx.createGain();
  out.gain.value = 0;
  out.connect(master);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 4;
  filter.connect(out);

  const fire = ctx.createOscillator();
  fire.type = 'sawtooth';
  const rumble = ctx.createOscillator();
  rumble.type = 'square';
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.5;
  fire.connect(filter);
  rumble.connect(rumbleGain).connect(filter);
  fire.start();
  rumble.start();

  const tireGain = ctx.createGain();
  tireGain.gain.value = 0;
  const tireFilter = ctx.createBiquadFilter();
  tireFilter.type = 'bandpass';
  tireFilter.frequency.value = 1800;
  tireFilter.Q.value = 3;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer();
  noise.loop = true;
  noise.connect(tireFilter).connect(tireGain).connect(master);
  noise.start();

  return {
    update(rpm, throttle, spin = false) {
      const t = ctx.currentTime;
      const firing = Math.max(20, (rpm / 60) * 4);
      fire.frequency.setTargetAtTime(firing, t, 0.03);
      rumble.frequency.setTargetAtTime(firing / 2, t, 0.03);
      filter.frequency.setTargetAtTime(300 + rpm / 6 + throttle * 600, t, 0.05);
      out.gain.setTargetAtTime((0.09 + throttle * 0.11) * volume, t, 0.05);
      tireGain.gain.setTargetAtTime(spin ? 0.12 * volume : 0, t, 0.04);
    },
    stop() {
      const t = ctx.currentTime;
      out.gain.setTargetAtTime(0, t, 0.1);
      tireGain.gain.setTargetAtTime(0, t, 0.05);
      setTimeout(() => {
        fire.stop();
        rumble.stop();
        noise.stop();
        out.disconnect();
      }, 500);
    },
  };
};

export const beep = (freq = 880, duration = 0.12, type = 'square', gain = 0.15) => {
  if (!ensure()) {
    return;
  }
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.setTargetAtTime(0, ctx.currentTime + duration * 0.7, 0.02);
  osc.connect(g).connect(master);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.1);
};

export const crash = () => {
  if (!ensure()) {
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  const g = ctx.createGain();
  g.gain.value = 0.6;
  g.gain.setTargetAtTime(0, ctx.currentTime + 0.1, 0.18);
  src.connect(filter).connect(g).connect(master);
  src.start();
  src.stop(ctx.currentTime + 1.2);
};

export const bang = () => {
  crash();
  beep(70, 0.4, 'sawtooth', 0.3);
};

export const cash = () => {
  beep(988, 0.08);
  setTimeout(() => beep(1319, 0.18), 90);
};
