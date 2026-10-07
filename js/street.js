import { beep, crash as crashSound, bang, createEngine } from './audio.js';
import { MODELS, shortName } from './data.js';
import { banner, drawTach, gearLabel, text } from './hud.js';
import { input } from './input.js';
import { buildSpec, newRunner, shift, step } from './physics.js';
import { drawBillboard, drawCarFront, drawCarRear, drawPine, drawPost, drawRock, drawSign } from './sprites.js';

const W = 640;
const H = 400;
const SEG = 200;
const UPM = SEG / 5;
const ROAD_W = 2000;
const CAM_H = 1000;
const CAM_DEPTH = 1 / Math.tan((100 / 2) * (Math.PI / 180));
const PLAYER_Z = CAM_H * CAM_DEPTH;
const DRAW = 150;
const START_M = 30;
const CAR_W = 450;
const PLAYER_HALF = 0.11;
const BILLBOARDS = ["HAL'S SPEED SHOP", 'TIP-TOP DRIVE-IN', 'DRINK FIZZ COLA', 'DEAD MAN\'S CURVE', 'SLOW DOWN!', 'VISIT PALOMA VALLEY'];

const COLORS = {
  light: { road: '#5a5660', grass: '#2f5a2f', rumble: '#e8e8e8', lane: '#f2c230' },
  dark: { road: '#544f5a', grass: '#29502a', rumble: '#c0202a', lane: null },
};

const easeIn = (a, b, p) => a + (b - a) * p * p;
const easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
const lerp = (a, b, p) => a + (b - a) * p;

const buildTrack = () => {
  const segments = [];
  const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);
  const addSegment = (curve, y) => {
    const n = segments.length;
    segments.push({
      index: n,
      p1: { world: { y: lastY(), z: n * SEG }, camera: {}, screen: {} },
      p2: { world: { y, z: (n + 1) * SEG }, camera: {}, screen: {} },
      curve,
      sprites: [],
      color: Math.floor(n / 3) % 2 ? COLORS.dark : COLORS.light,
    });
  };
  const addRoad = (enter, hold, leave, curve, height) => {
    const startY = lastY();
    const endY = startY + height * SEG;
    const total = enter + hold + leave;
    for (let n = 0; n < enter; n++) {
      addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
    }
    for (let n = 0; n < hold; n++) {
      addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
    }
    for (let n = 0; n < leave; n++) {
      addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    }
  };
  const layout = [
    [0, 26, 0, 0, 0], [15, 20, 15, 2, 4], [10, 20, 10, 0, -4], [15, 15, 15, -3, 6], [8, 8, 8, 3, 0], [8, 8, 8, -3, 0],
    [15, 30, 15, 0, -8], [15, 20, 15, 5, 0], [10, 15, 10, -2, 5], [8, 10, 8, 4, 0], [8, 10, 8, -4, -5],
    [15, 30, 15, 0, 3], [15, 15, 15, -6, 0], [8, 20, 8, 1, -3], [0, 25, 0, 0, 0],
  ];
  layout.forEach((args) => addRoad(...args));
  const finishIndex = segments.length - 10;
  addRoad(0, DRAW + 60, 0, 0, 0);

  const add = (index, kind, offset, w, h, extra = {}) => {
    if (segments[index]) {
      segments[index].sprites.push({ kind, offset, w, h, ...extra });
    }
  };
  let billboard = 0;
  for (let i = 8; i < segments.length; i++) {
    const seg = segments[i];
    if (i % 4 === 0) {
      const side = (i / 4) % 2 ? 1 : -1;
      add(i, 'pine', side * (1.5 + Math.random() * 1.8), 700, 1500);
    }
    if (i % 7 === 3) {
      add(i, Math.random() < 0.3 ? 'rock' : 'pine', (Math.random() < 0.5 ? -1 : 1) * (2.4 + Math.random() * 2), 600, 1200);
    }
    if (Math.abs(seg.curve) >= 3.5 && i % 3 === 0) {
      add(i, 'post', Math.sign(seg.curve) * -1.2, 70, 220);
    }
    const ahead = segments[i + 12];
    if (ahead && Math.abs(ahead.curve) > 1 && Math.abs(segments[i + 11].curve) <= 1 && Math.abs(seg.curve) < 0.5) {
      add(i, 'sign', Math.sign(ahead.curve) * -1.25, 360, 800, { dir: Math.sign(ahead.curve) });
    }
    if (i % 90 === 45) {
      add(i, 'billboard', (billboard % 2 ? 1 : -1) * 2.0, 1500, 1100, { label: BILLBOARDS[billboard % BILLBOARDS.length] });
      billboard += 1;
    }
  }
  add(finishIndex, 'finish', 0, ROAD_W * 2.6, 1700);
  add(Math.round(START_M / 5) + 2, 'start', 0, ROAD_W * 2.6, 1700);
  segments[finishIndex].finish = true;
  segments[Math.round(START_M / 5) + 3].finish = true;
  return { segments, finishM: finishIndex * 5 };
};

const centrifugal = (sp) => 0.38 / (0.6 + 0.5 * sp.mu);

export const startStreet = (canvas, { playerCar, rival, sound }, onDone) => {
  const ctx = canvas.getContext('2d');
  const { segments, finishM } = buildTrack();
  const segAt = (meters) => segments[Math.max(0, Math.min(segments.length - 1, Math.floor(meters / 5)))];

  const psp = buildSpec(playerCar);
  const rsp = buildSpec(rival.car);
  const player = newRunner(psp);
  const opp = newRunner(rsp);
  player.x = START_M;
  opp.x = START_M;
  let playerX = 0.45;
  let oppX = -0.45;
  const skill = rival.skill;
  const aiShiftAt = rsp.shiftRpms.map((r) => r * (0.97 + Math.random() * 0.04));
  const aiReaction = 0.15 + (1 - skill) * 0.3;
  const aggression = 0.8 + 0.16 * skill;

  const traffic = [];
  for (let i = 0; i < 9; i++) {
    traffic.push({ zm: 180 + i * 290 + Math.random() * 120, offset: 0.45, v: 12 + Math.random() * 5, color: ['#efe6c8', '#2b5fa8', '#7c7a74', '#8fd6b4'][i % 4], body: i % 3 ? 'sedan' : 'hardtop' });
  }
  for (let i = 0; i < 11; i++) {
    traffic.push({ zm: 250 + i * 240 + Math.random() * 100, offset: -0.45, v: -(15 + Math.random() * 6), color: ['#b3202a', '#f2c230', '#efe6c8', '#2bb3a8'][i % 4], body: 'sedan' });
  }

  const pEngine = sound ? createEngine(1) : null;
  const rEngine = sound ? createEngine(0.4) : null;

  const GO_AT = 4;
  let t = 0;
  let crashT = 0;
  let crashes = 0;
  let damage = 0;
  let winner = null;
  let endAt = null;
  let done = false;
  let paused = false;
  let bgOffset = 0;
  let message = '';
  let messageUntil = 0;
  let lastCount = -1;
  let pFinish = null;
  let rFinish = null;
  let lastBlown = player.blown;
  let maxOverRev = 0;
  let shake = 0;
  let playerBraking = false;

  const flash = (msg, seconds = 1.2) => {
    message = msg;
    messageUntil = t + seconds;
  };

  const doCrash = (msg) => {
    crashT = 1.3;
    crashes += 1;
    damage += 6;
    player.v *= 0.08;
    player.gear = 0;
    shake = 0.7;
    flash(msg, 1.6);
    if (sound) {
      crashSound();
    }
  };

  const decide = (who) => {
    if (!winner) {
      winner = who;
      endAt = t + 2.5;
    }
  };

  const aiTarget = () => {
    const cent = centrifugal(rsp);
    let target = 999;
    for (let d = 0; d < 50; d++) {
      const seg = segAt(opp.x + d * 5);
      const c = Math.abs(seg.curve);
      if (c > 0.3) {
        const vmax = (50 / (c * cent)) * aggression;
        target = Math.min(target, Math.sqrt(vmax * vmax + 2 * 6.5 * d * 5));
      }
    }
    return target;
  };

  const update = (dt) => {
    t += dt;
    const count = Math.floor(t);
    if (count !== lastCount && count >= 1 && count <= GO_AT) {
      lastCount = count;
      if (sound) {
        beep(count === GO_AT ? 880 : 440, count === GO_AT ? 0.3 : 0.12);
      }
    }
    const racing = t >= GO_AT;
    const pDone = pFinish !== null;

    if (input.take('shiftUp') && !psp.auto) {
      shift(psp, player, 1);
    }
    if (input.take('shiftDown') && !psp.auto) {
      shift(psp, player, -1);
    }

    const playerSeg = segAt(player.x);
    const speedPct = player.v / 50;
    const steerRate = dt * 2.2 * Math.min(1, Math.max(0.15, speedPct));
    let throttle = 0;
    let brake = 0;
    if (crashT > 0) {
      crashT -= dt;
      brake = 1;
    } else if (pDone) {
      brake = 0.4;
    } else {
      throttle = input.held('gas') ? 1 : 0;
      brake = input.held('brake') ? 1 : 0;
      if (input.held('left')) {
        playerX -= steerRate;
      }
      if (input.held('right')) {
        playerX += steerRate;
      }
    }
    playerBraking = brake > 0;
    playerX -= steerRate * speedPct * playerSeg.curve * centrifugal(psp);
    const offRoad = Math.abs(playerX) > 1;
    if (offRoad && player.v > 12) {
      brake = Math.max(brake, 0.55);
      shake = Math.max(shake, 0.15);
    }
    playerX = Math.max(-3, Math.min(3, playerX));

    if (racing) {
      step(psp, player, dt, throttle, brake);
    } else {
      player.rpm += ((input.held('gas') ? psp.peakRpm * 0.7 : psp.idle) - player.rpm) * Math.min(1, dt * 4);
    }
    maxOverRev = Math.max(maxOverRev, player.overRev);
    if (player.blown && !lastBlown) {
      lastBlown = true;
      flash('ENGINE BLOWN!', 3);
      if (sound) {
        bang();
      }
    }

    bgOffset += playerSeg.curve * player.v * dt * 0.00045;

    if (crashT <= 0 && !pDone) {
      for (const s of playerSeg.sprites) {
        if (s.kind === 'finish' || s.kind === 'start' || s.kind === 'billboard') {
          continue;
        }
        const half = (s.kind === 'pine' ? s.w * 0.25 : s.w * 0.5) / ROAD_W;
        if (Math.abs(playerX - s.offset) < PLAYER_HALF + half) {
          doCrash(s.kind === 'post' ? 'GUARDRAIL!' : 'CRASH!');
          playerX = Math.sign(playerX) * 0.85;
          break;
        }
      }
      for (const car of traffic) {
        if (car.hit) {
          continue;
        }
        const dz = car.zm - player.x;
        if (Math.abs(dz) < 4.5 && Math.abs(car.offset - playerX) < PLAYER_HALF * 2) {
          car.hit = true;
          doCrash(car.v < 0 ? 'HEAD-ON!' : 'REAR-ENDED!');
          if (car.v < 0) {
            damage += 6;
          }
          break;
        }
      }
    }

    traffic.forEach((car) => {
      car.zm += car.v * dt;
      if (car.v < 0 && car.zm < player.x - 60) {
        car.zm = player.x + 500 + Math.random() * 300;
        car.hit = false;
      }
    });

    if (racing && t - GO_AT >= aiReaction && !opp.blown) {
      const rDone = rFinish !== null;
      const target = aiTarget();
      let rThrottle = 1;
      let rBrake = 0;
      if (rDone) {
        rThrottle = 0;
        rBrake = 0.4;
      } else if (opp.v > target + 0.8) {
        rThrottle = 0;
        rBrake = Math.min(1, (opp.v - target) / 5);
      } else if (opp.v > target - 0.5) {
        rThrottle = 0.35;
      }
      if (!rsp.auto) {
        if (opp.gear < rsp.gears.length - 1 && opp.rpm >= aiShiftAt[opp.gear]) {
          shift(rsp, opp, 1);
        } else if (opp.gear > 0 && opp.rpm < rsp.peakRpm * 0.5 && rThrottle > 0) {
          shift(rsp, opp, -1);
        }
      }
      step(rsp, opp, dt, rThrottle, rBrake);
      opp.braking = rBrake > 0;
    }
    let desired = opp.x > START_M + 60 ? 0.45 : -0.45;
    const blocker = traffic.find((c) => c.v > 0 && c.zm > opp.x && c.zm - opp.x < 70 && opp.v > c.v + 2);
    if (blocker) {
      desired = -0.45;
    }
    oppX += Math.sign(desired - oppX) * Math.min(Math.abs(desired - oppX), dt * 0.6);

    const gap = opp.x - player.x;
    if (Math.abs(gap) < 4.2 && Math.abs(oppX - playerX) < PLAYER_HALF * 2 && crashT <= 0) {
      if (gap > 0) {
        player.v *= 0.85;
        player.x = opp.x - 4.2;
      } else {
        opp.v *= 0.85;
        opp.x = player.x - 4.2;
      }
      playerX += playerX > oppX ? 0.08 : -0.08;
      shake = 0.3;
      if (sound) {
        beep(90, 0.08, 'sawtooth', 0.2);
      }
    }

    if (pFinish === null && player.x >= finishM) {
      pFinish = t - GO_AT;
      decide(rFinish === null ? 'player' : 'rival');
    }
    if (rFinish === null && opp.x >= finishM) {
      rFinish = t - GO_AT;
      decide(pFinish === null ? 'rival' : 'player');
    }
    if (!winner && player.blown && player.v < 0.2) {
      decide('rival');
    }
    if (!winner && opp.blown && opp.v < 0.2 && player.x > opp.x) {
      decide('player');
    }

    if (shake > 0) {
      shake -= dt;
    }
    if (pEngine) {
      pEngine.update(player.rpm, throttle || (!racing && input.held('gas') ? 0.7 : 0), player.spin || (crashT > 0.8));
      const near = Math.max(0.15, 1 - Math.abs(gap) / 150);
      rEngine.update(opp.rpm, near, false);
    }
    if (endAt !== null && t >= endAt && !done) {
      done = true;
      input.take('gas');
      input.take('shiftUp');
    }
  };

  const project = (p, camX, camY, camZ) => {
    p.camera.x = -camX;
    p.camera.y = p.world.y - camY;
    p.camera.z = p.world.z - camZ;
    p.screen.scale = CAM_DEPTH / p.camera.z;
    p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * W / 2);
    p.screen.y = Math.round(H / 2 - p.screen.scale * p.camera.y * H / 2);
    p.screen.w = Math.round(p.screen.scale * ROAD_W * W / 2);
  };

  const quad = (color, x1, y1, w1, x2, y2, w2) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x2 - w2, y2);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x1 + w1, y1);
    ctx.closePath();
    ctx.fill();
  };

  const drawBackground = () => {
    const sky = ctx.createLinearGradient(0, 0, 0, H / 2 + 20);
    sky.addColorStop(0, '#120a35');
    sky.addColorStop(0.55, '#5b2a6e');
    sky.addColorStop(0.85, '#e0645a');
    sky.addColorStop(1, '#ffb15c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff2c0';
    for (let i = 0; i < 30; i++) {
      ctx.fillRect((i * 131) % W, (i * 47) % 90, 1, 1);
    }
    const sunX = ((W * 0.7 - bgOffset * W * 0.2) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25;
    ctx.fillStyle = '#ffd27a';
    ctx.beginPath();
    ctx.arc(sunX, H / 2 + 6, 34, Math.PI, 0);
    ctx.fill();
    const ridge = (color, speed, base, amp, freq) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) {
        const u = x / W + bgOffset * speed;
        const y = base - amp * (0.55 * Math.sin(u * freq * Math.PI * 2) + 0.3 * Math.sin(u * freq * 2.7 * Math.PI * 2 + 1) + 0.15 * Math.sin(u * freq * 6.1 * Math.PI * 2));
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.fill();
    };
    ridge('#3a1f4f', 0.3, H / 2 + 4, 40, 1.5);
    ridge('#26163a', 0.6, H / 2 + 14, 30, 2.3);
  };

  const drawSprite = (s, x, y, scale, clip) => {
    const w = s.w * scale * W / 2;
    const h = s.h * scale * W / 2;
    if (x + w < -50 || x - w > W + 50 || w < 1) {
      return;
    }
    const needsClip = y > clip;
    if (needsClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, clip);
      ctx.clip();
    }
    switch (s.kind) {
      case 'pine':
        drawPine(ctx, x, y, w, h);
        break;
      case 'rock':
        drawRock(ctx, x, y, w, h * 0.5);
        break;
      case 'post':
        drawPost(ctx, x, y, w, h);
        break;
      case 'sign':
        drawSign(ctx, x, y, w, h, s.dir);
        break;
      case 'billboard':
        drawBillboard(ctx, x, y, w, h, s.label);
        break;
      case 'finish':
      case 'start': {
        const pole = w * 0.012;
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x - w / 2, y - h, pole, h);
        ctx.fillRect(x + w / 2 - pole, y - h, pole, h);
        const bh = h * 0.18;
        const cells = 24;
        for (let i = 0; i < cells; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff';
            ctx.fillRect(x - w / 2 + (w / cells) * i, y - h + (bh / 2) * j, w / cells + 1, bh / 2 + 1);
          }
        }
        if (w > 120) {
          ctx.fillStyle = '#b3202a';
          ctx.fillRect(x - w * 0.2, y - h + bh, w * 0.4, bh * 0.9);
          text(ctx, s.kind === 'finish' ? 'FINISH' : 'START', x, y - h + bh * 1.15, Math.max(6, Math.floor(bh * 0.45)), '#fff', 'center');
        }
        break;
      }
      default:
        break;
    }
    if (needsClip) {
      ctx.restore();
    }
  };

  const drawRoadCar = (car, x, y, scale, clip, kind) => {
    const w = CAR_W * scale * W / 2;
    if (w < 2 || x + w < 0 || x - w > W) {
      return;
    }
    const needsClip = y > clip;
    if (needsClip) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, clip);
      ctx.clip();
    }
    if (kind === 'oncoming') {
      drawCarFront(ctx, x, y, w, car.color);
    } else {
      drawCarRear(ctx, x, y, w, car.color, car.body, car.braking);
    }
    if (needsClip) {
      ctx.restore();
    }
  };

  const draw = () => {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
    }
    drawBackground();

    const position = player.x * UPM - PLAYER_Z;
    const baseSegment = segments[Math.floor(position / SEG)];
    const basePercent = (position % SEG) / SEG;
    const playerSeg = segAt(player.x);
    const playerPercent = ((player.x * UPM) % SEG) / SEG;
    const playerY = lerp(playerSeg.p1.world.y, playerSeg.p2.world.y, playerPercent);
    let maxy = H;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    const roadCars = new Map();
    const addCar = (zm, offset, car, kind) => {
      const z = zm * UPM;
      const index = Math.floor(z / SEG);
      if (index <= baseSegment.index || index >= baseSegment.index + DRAW) {
        return;
      }
      if (!roadCars.has(index)) {
        roadCars.set(index, []);
      }
      roadCars.get(index).push({ car, offset, percent: (z % SEG) / SEG, kind });
    };
    traffic.forEach((car) => addCar(car.zm, car.offset, car, car.v < 0 ? 'oncoming' : 'same'));
    if (opp.x > player.x + 1) {
      addCar(opp.x, oppX, { color: rival.car.color, body: MODELS[rival.car.model].body, braking: opp.braking }, 'rival');
    }

    for (let n = 0; n < DRAW; n++) {
      const seg = segments[baseSegment.index + n];
      if (!seg) {
        break;
      }
      seg.clip = maxy;
      project(seg.p1, playerX * ROAD_W - x, playerY + CAM_H, position);
      project(seg.p2, playerX * ROAD_W - x - dx, playerY + CAM_H, position);
      x += dx;
      dx += seg.curve;
      if (seg.p1.camera.z <= CAM_DEPTH || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) {
        seg.skip = true;
        continue;
      }
      seg.skip = false;
      const p1 = seg.p1.screen;
      const p2 = seg.p2.screen;
      ctx.fillStyle = seg.color.grass;
      ctx.fillRect(0, p2.y, W, p1.y - p2.y + 1);
      quad(seg.color.rumble, p1.x, p1.y, p1.w * 1.12, p2.x, p2.y, p2.w * 1.12);
      quad(seg.finish ? (Math.floor(seg.index) % 2 ? '#eee' : '#222') : seg.color.road, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w);
      if (seg.color.lane) {
        const l1 = Math.max(1, p1.w / 50);
        const l2 = Math.max(1, p2.w / 50);
        quad(seg.color.lane, p1.x - l1 * 1.5, p1.y, l1 * 0.7, p2.x - l2 * 1.5, p2.y, l2 * 0.7);
        quad(seg.color.lane, p1.x + l1 * 1.5, p1.y, l1 * 0.7, p2.x + l2 * 1.5, p2.y, l2 * 0.7);
      }
      maxy = p1.y;
    }

    for (let n = DRAW - 1; n > 0; n--) {
      const seg = segments[baseSegment.index + n];
      if (!seg || seg.p1.camera.z <= CAM_DEPTH) {
        continue;
      }
      const cars = roadCars.get(seg.index);
      if (cars) {
        cars.forEach(({ car, offset, percent, kind }) => {
          const scale = lerp(seg.p1.screen.scale, seg.p2.screen.scale, percent);
          const sx = lerp(seg.p1.screen.x, seg.p2.screen.x, percent) + scale * offset * ROAD_W * W / 2;
          const sy = lerp(seg.p1.screen.y, seg.p2.screen.y, percent);
          drawRoadCar(car, sx, sy, scale, seg.clip, kind);
        });
      }
      seg.sprites.forEach((s) => {
        const scale = seg.p1.screen.scale;
        const sx = seg.p1.screen.x + scale * s.offset * ROAD_W * W / 2;
        drawSprite(s, sx, seg.p1.screen.y, scale, seg.clip);
      });
    }

    const bounce = player.v > 1 ? Math.sin(t * 30) * Math.min(2, player.v / 20) : 0;
    const spinOff = crashT > 0 ? Math.sin(crashT * 20) * 20 : 0;
    const carX = W / 2 + spinOff + (input.held('left') ? -4 : 0) + (input.held('right') ? 4 : 0);
    drawCarRear(ctx, carX, H - 10 + bounce, 150, playerCar.color, MODELS[playerCar.model].body, playerBraking);
    if ((player.spin || crashT > 0.6) && player.v > 0.5) {
      ctx.fillStyle = 'rgba(220,220,220,0.35)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(carX - 60 + i * 40 + Math.random() * 10, H - 10, 14 + Math.random() * 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
    drawHud();
  };

  const drawHud = () => {
    const progress = (m) => Math.max(0, Math.min(1, (m - START_M) / (finishM - START_M)));
    ctx.fillStyle = 'rgba(10,6,30,0.7)';
    ctx.fillRect(0, 0, W, 34);
    ctx.fillStyle = '#444';
    ctx.fillRect(120, 14, 400, 6);
    ctx.fillStyle = '#ff9ab0';
    ctx.fillRect(120 + progress(opp.x) * 400 - 3, 9, 6, 16);
    ctx.fillStyle = '#8fd6b4';
    ctx.fillRect(120 + progress(player.x) * 400 - 3, 9, 6, 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(520, 8, 2, 18);
    const leading = player.x >= opp.x;
    text(ctx, leading ? '1ST' : '2ND', 12, 9, 16, leading ? '#8fd6b4' : '#ff9ab0');
    const remaining = Math.max(0, finishM - player.x);
    text(ctx, `${(remaining / 1609).toFixed(2)} MI`, W - 10, 13, 8, '#fff', 'right');

    ctx.fillStyle = 'rgba(10,6,30,0.75)';
    ctx.fillRect(W - 210, H - 96, 210, 96);
    drawTach(ctx, W - 160, H - 48, 40, player.rpm, psp, player, t);
    text(ctx, String(Math.round(player.v * 2.237)).padStart(3, '0'), W - 104, H - 84, 16, '#8fd6b4');
    text(ctx, 'MPH', W - 104, H - 64, 8, '#8fd6b4');
    text(ctx, gearLabel(psp, player), W - 50, H - 84, 16, '#ffe14d');
    text(ctx, 'GEAR', W - 56, H - 64, 8, '#ffe14d');
    text(ctx, `GAP ${Math.round(Math.abs(opp.x - player.x))}m`, W - 104, H - 44, 8, '#ccc');
    text(ctx, `WRECKS ${crashes}`, W - 104, H - 28, 8, crashes ? '#ff8a1f' : '#ccc');
    if (t < 6) {
      text(ctx, psp.auto ? '↑ GAS  ↓ BRAKE  ←→ STEER' : '↑ GAS ↓ BRAKE ←→ STEER  SPACE/Q GEARS', W / 2, 44, 8, '#ddd', 'center');
    }

    if (t < GO_AT) {
      const n = GO_AT - Math.floor(t);
      text(ctx, n >= GO_AT ? 'READY' : String(n), W / 2, 120, 28, '#ffb020', 'center');
    } else if (t < GO_AT + 0.8) {
      text(ctx, 'GO!', W / 2, 120, 28, '#30ff50', 'center');
    }
    if (t < messageUntil) {
      text(ctx, message, W / 2, 150, 16, '#ff5050', 'center');
    } else if (Math.abs(playerX) > 1 && player.v > 5) {
      text(ctx, 'OFF ROAD', W / 2, 150, 12, '#ffb020', 'center');
    } else if (!psp.auto && player.rpm > psp.redline + 50 && Math.floor(t * 6) % 2 === 0) {
      text(ctx, 'OVER-REV!', W / 2, 150, 14, '#ff5050', 'center');
    }

    if (done) {
      const won = winner === 'player';
      const lines = [];
      if (pFinish !== null) {
        lines.push(`Your time: ${pFinish.toFixed(1)}s`);
      }
      if (rFinish !== null) {
        lines.push(`${shortName(rival.name)}: ${rFinish.toFixed(1)}s`);
      }
      if (crashes) {
        lines.push(`Wrecks: ${crashes}`);
      }
      lines.push('');
      lines.push('Press SPACE or tap to continue');
      banner(ctx, W, H, won ? 'YOU WIN!' : 'YOU LOSE', lines, won ? '#30ff50' : '#ff5050');
    }
  };

  let raf = 0;
  let last = performance.now();
  let resolved = false;
  const finish = () => {
    if (resolved) {
      return;
    }
    resolved = true;
    cancelAnimationFrame(raf);
    canvas.removeEventListener('pointerdown', onTap);
    pEngine?.stop();
    rEngine?.stop();
    onDone({
      won: winner === 'player',
      blown: player.blown,
      overRev: maxOverRev,
      crashes,
      damage,
      playerTime: pFinish,
      rivalTime: rFinish,
    });
  };
  const onTap = () => {
    if (done) {
      finish();
    }
  };
  canvas.addEventListener('pointerdown', onTap);

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (input.take('pause') && !done) {
      paused = !paused;
    }
    if (!paused && !done) {
      const sub = 3;
      for (let i = 0; i < sub; i++) {
        update(dt / sub);
      }
    }
    if (done && (input.take('shiftUp') || input.take('gas'))) {
      finish();
      return;
    }
    draw();
    if (paused) {
      banner(ctx, W, H, 'PAUSED', ['Press P to resume']);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return { stop: () => { cancelAnimationFrame(raf); pEngine?.stop(); rEngine?.stop(); } };
};
