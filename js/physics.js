import { ENGINES, MODELS, PARTS } from './data.js';

const G = 9.81;
const RHO = 1.2;
const EFF = 0.86;
const TQ_PEAK_AT = 0.65;
const CURVE_A = 1 / ((1 - TQ_PEAK_AT) ** 2 + 2 * (1 - TQ_PEAK_AT));
const RPM_PER_RADS = 60 / (2 * Math.PI);

export const QUARTER = 402.336;

export const partOf = (car, group) => {
  const options = PARTS[group].options;
  return options.find((o) => o.id === car.parts[group]) || options[0];
};

export const torqueAt = (sp, rpm) => {
  const x = rpm / sp.peakRpm;
  let t = Math.max(0.3, 1 - CURVE_A * (x - TQ_PEAK_AT) ** 2);
  if (rpm > sp.redline) {
    t *= Math.max(0, 1 - (rpm - sp.redline) / 600);
  }
  return sp.tqPeak * t;
};

const wheelForce = (sp, gear, rpm) => (torqueAt(sp, rpm) * sp.gears[gear] * sp.final * EFF) / sp.r;

const computeShiftRpms = (sp) => {
  const result = [];
  for (let g = 0; g < sp.gears.length - 1; g++) {
    const step = sp.gears[g + 1] / sp.gears[g];
    let shiftAt = sp.redline - 100;
    for (let rpm = sp.peakRpm * 0.85; rpm < sp.redline; rpm += 25) {
      if (wheelForce(sp, g, rpm) < wheelForce(sp, g + 1, rpm * step)) {
        shiftAt = rpm;
        break;
      }
    }
    result.push(Math.round(shiftAt));
  }
  return result;
};

export const buildSpec = (car) => {
  const model = MODELS[car.model];
  const engine = ENGINES[car.engine];
  const carb = partOf(car, 'carb');
  const cam = partOf(car, 'cam');
  const trans = partOf(car, 'trans');
  const tires = partOf(car, 'tires');
  let mult = carb.mult * cam.mult * partOf(car, 'headers').mult * partOf(car, 'ignition').mult;
  if (carb.id === 'blower' && engine.boostBonus) {
    mult *= 1 + engine.boostBonus;
  }
  const conditionPct = car.condition ?? 100;
  const condition = Math.max(0, conditionPct) / 100;
  const hp = engine.hp * mult * (0.6 + 0.4 * condition);
  const peakRpm = engine.peak + cam.peakAdd;
  const redline = engine.redline + cam.redAdd + partOf(car, 'ignition').redAdd;
  const torqueAtPeak = (hp * 745.7) / (peakRpm / RPM_PER_RADS);
  const sp = {
    hp,
    peakRpm,
    redline,
    idle: 800,
    tqPeak: torqueAtPeak / (1 - CURVE_A * (1 - TQ_PEAK_AT) ** 2),
    mass: (model.weight + partOf(car, 'body').weight) * 0.4536 + 75,
    mu: tires.mu,
    r: tires.r,
    gears: trans.gears,
    auto: !!trans.auto,
    shiftTime: trans.shift * partOf(car, 'shifter').shiftMult,
    final: partOf(car, 'gear').ratio,
    cdA: model.cdA,
    rearBias: model.rearBias || 0.62,
    launchRpm: Math.min(redline * 0.75, peakRpm * 0.62),
    stallRpm: peakRpm * 0.45,
    shiftLight: car.parts.tach === 'sun',
    blown: conditionPct <= 0,
  };
  sp.shiftRpms = computeShiftRpms(sp);
  return sp;
};

export const newRunner = (sp) => ({
  x: 0, v: 0, gear: 0, rpm: sp.idle, shiftT: 0, spin: false, overRev: 0, blown: sp.blown, wheelRpm: 0,
});

export const shift = (sp, s, dir) => {
  const next = s.gear + dir;
  if (s.shiftT > 0 || next < 0 || next >= sp.gears.length) {
    return false;
  }
  s.gear = next;
  s.shiftT = sp.shiftTime;
  return true;
};

export const step = (sp, s, dt, throttleIn, brake = 0) => {
  const throttle = s.blown ? 0 : throttleIn;
  const ratio = sp.gears[s.gear] * sp.final;
  const wheelRpm = (s.v / sp.r) * ratio * RPM_PER_RADS;
  s.wheelRpm = wheelRpm;
  let drive = 0;
  if (s.shiftT > 0) {
    s.shiftT -= dt;
    const target = Math.max(sp.idle, wheelRpm);
    s.rpm += (target - s.rpm) * Math.min(1, dt * 12);
    s.spin = false;
  } else {
    let floor = sp.idle;
    if (throttle > 0) {
      floor = sp.auto ? sp.stallRpm : sp.launchRpm;
    }
    let target = Math.max(wheelRpm, floor);
    if (s.spin) {
      target = Math.max(target, Math.min(sp.redline + 300, wheelRpm * 1.3 + 600));
    }
    if (s.blown) {
      target = Math.min(target, wheelRpm);
    }
    s.rpm += (target - s.rpm) * Math.min(1, dt * 15);
    let tq;
    if (throttle > 0) {
      tq = torqueAt(sp, s.rpm) * throttle;
      if (sp.auto && wheelRpm < sp.stallRpm) {
        tq *= 1 + 0.8 * (1 - wheelRpm / sp.stallRpm);
      }
    } else {
      tq = -0.06 * sp.tqPeak * (s.rpm / sp.peakRpm);
    }
    drive = (tq * ratio * EFF) / sp.r;
    const traction = sp.mu * sp.mass * G * sp.rearBias;
    s.spin = drive > traction;
    if (s.spin) {
      drive = traction * 0.8;
    }
  }
  const aero = 0.5 * RHO * sp.cdA * s.v * s.v;
  const roll = s.v > 0.05 ? 0.013 * sp.mass * G : 0;
  const brakeForce = brake * sp.mass * G * 0.85;
  const accel = (drive - aero - roll - brakeForce) / sp.mass;
  s.v = Math.max(0, s.v + accel * dt);
  s.x += s.v * dt;
  s.accel = accel;

  if (s.rpm > sp.redline + 50 && !s.blown) {
    s.overRev += dt * (1 + (s.rpm - sp.redline) / 400);
    if (s.overRev > 2.4) {
      s.blown = true;
    }
  } else {
    s.overRev = Math.max(0, s.overRev - dt * 0.5);
  }

  if (sp.auto && s.shiftT <= 0) {
    if (s.gear < sp.gears.length - 1 && s.rpm >= sp.shiftRpms[s.gear]) {
      shift(sp, s, 1);
    } else if (s.gear > 0 && throttle > 0 && s.rpm < sp.peakRpm * 0.42) {
      shift(sp, s, -1);
    }
  }
};

export const estimate = (sp) => {
  if (sp.blown) {
    return null;
  }
  const s = newRunner(sp);
  const dt = 1 / 200;
  let t = 0;
  while (s.x < QUARTER && t < 40) {
    if (!sp.auto && s.gear < sp.gears.length - 1 && s.rpm >= sp.shiftRpms[s.gear]) {
      shift(sp, s, 1);
    }
    step(sp, s, dt, 1);
    t += dt;
  }
  return { et: t, mph: s.v * 2.237 };
};

export const topSpeed = (sp) => {
  let best = 0;
  for (let v = 1; v < 110; v += 0.5) {
    let force = 0;
    for (let g = 0; g < sp.gears.length; g++) {
      const rpm = (v / sp.r) * sp.gears[g] * sp.final * RPM_PER_RADS;
      if (rpm <= sp.redline) {
        force = Math.max(force, Math.min(wheelForce(sp, g, rpm), sp.mu * sp.mass * G * sp.rearBias));
      }
    }
    if (force - 0.5 * RHO * sp.cdA * v * v - 0.013 * sp.mass * G > 0) {
      best = v;
    }
  }
  return best * 2.237;
};
