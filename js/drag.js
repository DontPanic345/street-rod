import { createEngine, beep, bang } from './audio.js';
import { banner, drawTach, gearLabel, text } from './hud.js';
import { input } from './input.js';
import { MODELS, shortName } from './data.js';
import { QUARTER, buildSpec, newRunner, shift, step } from './physics.js';
import { drawCarTop } from './sprites.js';

const W = 640;
const H = 400;
const PX = 9;
const LANE_Y = { rival: 145, player: 215 };
const MARKERS = [[18.288, "60'"], [100.584, "330'"], [201.168, '1/8'], [304.8, "1000'"]];

const makeAi = (sp, skill) => ({
  reaction: 0.16 + (1 - skill) * 0.35 + Math.random() * 0.12,
  shiftAt: sp.shiftRpms.map((r) => Math.min(sp.redline + 150, r * (1 + (Math.random() - 0.55) * 0.14 * (1.2 - skill)))),
  launched: false,
});

export const startDrag = (canvas, { playerCar, rival, sound }, onDone) => {
  const ctx = canvas.getContext('2d');
  const psp = buildSpec(playerCar);
  const rsp = buildSpec(rival.car);
  const player = newRunner(psp);
  const opp = newRunner(rsp);
  const ai = makeAi(rsp, rival.skill);
  const pEngine = sound ? createEngine(1) : null;
  const rEngine = sound ? createEngine(0.45) : null;

  const greenAt = 3.1 + Math.random() * 0.9;
  let t = 0;
  let launched = false;
  let foul = false;
  let pFinish = null;
  let rFinish = null;
  let pMph = 0;
  let rMph = 0;
  let winner = null;
  let endAt = null;
  let done = false;
  let paused = false;
  let message = '';
  let messageUntil = 0;
  let shake = 0;
  let lastBlown = player.blown;
  let maxOverRev = 0;
  const smoke = [];
  let lastBeep = -1;

  const flash = (msg, seconds = 1) => {
    message = msg;
    messageUntil = t + seconds;
  };

  const decide = (who) => {
    if (winner) {
      return;
    }
    winner = who;
    endAt = t + 2.2;
  };

  const update = (dt) => {
    t += dt;
    const sinceGreen = t - greenAt;

    const tree = Math.floor((t - 1.6) / 0.5);
    if (t > 1.6 && tree < 3 && tree !== lastBeep) {
      lastBeep = tree;
      if (sound) {
        beep(440, 0.1);
      }
    }
    if (sinceGreen >= 0 && lastBeep < 3) {
      lastBeep = 3;
      if (sound) {
        beep(880, 0.25);
      }
    }

    if (!launched && !foul && input.take('gas')) {
      if (sinceGreen < 0) {
        foul = true;
        flash('RED LIGHT!', 3);
        decide('rival');
      } else {
        launched = true;
        player.rt = sinceGreen;
        shake = 0.4;
      }
    }
    if (input.take('shiftUp') && launched && !psp.auto && shift(psp, player, 1) && sound) {
      beep(180, 0.04, 'triangle', 0.08);
    }
    if (input.take('shiftDown') && launched && !psp.auto) {
      shift(psp, player, -1);
    }

    const finished = pFinish !== null;
    const pThrottle = launched && !finished && input.held('gas') ? 1 : 0;
    const pBrake = finished ? 0.35 : 0;
    const prevX = player.x;
    if (!launched && !foul && input.held('gas') === false) {
      player.rpm += (psp.idle - player.rpm) * Math.min(1, dt * 5);
    }
    if (launched || finished) {
      step(psp, player, dt, pThrottle, pBrake);
    }
    maxOverRev = Math.max(maxOverRev, player.overRev);
    if (player.blown && !lastBlown) {
      lastBlown = true;
      flash('ENGINE BLOWN!', 3);
      if (sound) {
        bang();
      }
      shake = 0.8;
    }
    if (pFinish === null && player.x >= QUARTER) {
      pFinish = sinceGreen - (player.x - QUARTER) / Math.max(1, player.v);
      pMph = player.v * 2.237;
      if (!foul) {
        decide(rFinish === null ? 'player' : 'rival');
      }
    }

    if (!ai.launched && sinceGreen >= ai.reaction) {
      ai.launched = true;
    }
    const rDone = rFinish !== null;
    if (ai.launched) {
      if (!rsp.auto && opp.gear < rsp.gears.length - 1 && opp.rpm >= ai.shiftAt[opp.gear]) {
        shift(rsp, opp, 1);
      }
      step(rsp, opp, dt, rDone ? 0 : 1, rDone ? 0.35 : 0);
    }
    if (rFinish === null && opp.x >= QUARTER) {
      rFinish = sinceGreen - (opp.x - QUARTER) / Math.max(1, opp.v);
      rMph = opp.v * 2.237;
      decide(pFinish === null ? 'rival' : 'player');
    }
    if (!winner && player.blown && opp.blown && player.v < 0.3 && opp.v < 0.3) {
      decide(player.x > opp.x ? 'player' : 'rival');
    }

    if (player.spin && player.v > 0.5) {
      for (let i = 0; i < 2; i++) {
        smoke.push({ x: player.x - 4.5 + Math.random(), y: LANE_Y.player + (Math.random() > 0.5 ? 9 : -9), r: 4, life: 1.2 });
      }
    }
    if (opp.spin && opp.v > 0.5) {
      smoke.push({ x: opp.x - 4.5, y: LANE_Y.rival + (Math.random() > 0.5 ? 9 : -9), r: 4, life: 1.2 });
    }
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life -= dt;
      p.r += dt * 18;
      p.y += (Math.random() - 0.5) * 20 * dt;
      if (p.life <= 0) {
        smoke.splice(i, 1);
      }
    }
    if (shake > 0) {
      shake -= dt;
    }

    if (pEngine) {
      const revving = !launched && !foul && input.held('gas');
      pEngine.update(revving ? psp.launchRpm : player.rpm, pThrottle || (revving ? 0.6 : 0), player.spin);
      rEngine.update(opp.rpm, ai.launched && !rDone ? 1 : 0.1, opp.spin);
    }

    if (endAt !== null && t >= endAt && !done) {
      done = true;
      input.take('gas');
      input.take('shiftUp');
    }
  };

  const draw = () => {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * 6 * shake, (Math.random() - 0.5) * 6 * shake);
    }
    const camX = Math.max(-260, player.x * PX - 230);
    const sx = (m) => m * PX - camX;

    const sky = ctx.createLinearGradient(0, 0, 0, 80);
    sky.addColorStop(0, '#0b0624');
    sky.addColorStop(1, '#3a1d5c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, 80);
    ctx.fillStyle = '#ffe9a8';
    for (let i = 0; i < 24; i++) {
      const x = ((i * 97 - camX * 0.05) % W + W) % W;
      ctx.fillRect(x, (i * 37) % 50 + 4, 1, 1);
    }
    ctx.fillStyle = '#140c26';
    for (let i = 0; i < 40; i++) {
      const x = ((i * 53 - camX * 0.3) % (W + 60) + W + 60) % (W + 60) - 30;
      const h = 12 + ((i * 7) % 5) * 5;
      ctx.beginPath();
      ctx.moveTo(x - 14, 72);
      ctx.lineTo(x, 72 - h);
      ctx.lineTo(x + 14, 72);
      ctx.fill();
    }
    ctx.fillStyle = '#1f3b1f';
    ctx.fillRect(0, 70, W, 30);
    ctx.fillRect(0, 260, W, 40);
    for (let i = 0; i < 30; i++) {
      const x = ((i * 47 - camX * 0.8) % (W + 40) + W + 40) % (W + 40) - 20;
      ctx.fillStyle = ['#e0182d', '#2bb3a8', '#efe6c8', '#f2c230', '#2b5fa8'][i % 5];
      ctx.fillRect(x, 76, 22, 10);
      ctx.fillStyle = '#9fd3e6';
      ctx.fillRect(x + 6, 78, 9, 6);
      ctx.fillStyle = '#f0c8a0';
      ctx.fillRect(x + 26, 80 + (i % 3), 3, 6);
    }

    ctx.fillStyle = '#3a3a40';
    ctx.fillRect(0, 100, W, 160);
    const seam = 6;
    const first = Math.floor(camX / PX / seam) * seam;
    for (let m = first; m * PX - camX < W; m += seam) {
      ctx.fillStyle = (m / seam) % 2 === 0 ? '#3e3e44' : '#36363b';
      ctx.fillRect(sx(m), 100, seam * PX, 160);
      ctx.fillStyle = '#2c2c30';
      ctx.fillRect(sx(m) + 20, 120 + ((m * 13) % 100), 30, 2);
    }
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, 102, W, 3);
    ctx.fillRect(0, 255, W, 3);
    for (let m = Math.floor(camX / PX / 8) * 8; m * PX - camX < W; m += 8) {
      ctx.fillRect(sx(m), 179, 4 * PX, 3);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(sx(0) - 2, 105, 4, 150);
    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#fff' : '#111';
        ctx.fillRect(sx(QUARTER) + col * 6, 105 + row * 10, 6, 10);
      }
    }
    MARKERS.forEach(([m, label]) => {
      const x = sx(m);
      if (x > -40 && x < W + 40) {
        ctx.fillStyle = '#ddd';
        ctx.fillRect(x - 1, 86, 2, 14);
        ctx.fillStyle = '#efe6c8';
        ctx.fillRect(x - 18, 70, 36, 16);
        text(ctx, label, x, 74, 8, '#1b1b22', 'center');
      }
    });
    const fx = sx(QUARTER);
    if (fx > -60 && fx < W + 60) {
      ctx.fillStyle = '#efe6c8';
      ctx.fillRect(fx - 30, 64, 60, 22);
      text(ctx, 'FINISH', fx, 71, 8, '#b3202a', 'center');
    }

    const treeX = sx(-1.5);
    if (treeX > -20) {
      ctx.fillStyle = '#222';
      ctx.fillRect(treeX - 6, 150, 12, 60);
      const sinceGreen = t - greenAt;
      const lit = (i) => {
        if (foul) {
          return i === 4;
        }
        if (i === 3) {
          return sinceGreen >= 0;
        }
        if (i === 4) {
          return false;
        }
        return t > 1.6 + i * 0.5 && sinceGreen < 0;
      };
      ['#ffb020', '#ffb020', '#ffb020', '#30ff50', '#ff2020'].forEach((c, i) => {
        ctx.fillStyle = lit(i) ? c : '#3a3a3a';
        ctx.beginPath();
        ctx.arc(treeX, 158 + i * 11, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const pModel = MODELS[playerCar.model];
    const rModel = MODELS[rival.car.model];
    drawCarTop(ctx, sx(opp.x - 2.5), LANE_Y.rival, 5 * PX, 20, rival.car.color, rModel.body, false);
    drawCarTop(ctx, sx(player.x - 2.5), LANE_Y.player, 5 * PX, 20, playerCar.color, pModel.body, playerCar.flames);
    smoke.forEach((p) => {
      ctx.fillStyle = `rgba(220,220,220,${Math.max(0, p.life * 0.45)})`;
      ctx.beginPath();
      ctx.arc(sx(p.x), p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (sx(opp.x) > W + 10) {
      text(ctx, `▶ ${Math.round(opp.x - player.x)}m`, W - 8, LANE_Y.rival - 4, 8, '#ffe14d', 'right');
    }
    ctx.restore();

    drawDash();
  };

  const drawDash = () => {
    const y0 = 300;
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(0, y0, W, H - y0);
    ctx.fillStyle = '#b8b8c0';
    ctx.fillRect(0, y0, W, 3);
    drawTach(ctx, 60, y0 + 52, 40, player.rpm, psp, player, t);

    text(ctx, 'MPH', 120, y0 + 18, 8, '#8fd6b4');
    text(ctx, String(Math.round(player.v * 2.237)).padStart(3, '0'), 120, y0 + 32, 24, '#8fd6b4');
    text(ctx, 'GEAR', 120, y0 + 66, 8, '#ffe14d');
    text(ctx, gearLabel(psp, player), 170, y0 + 62, 16, '#ffe14d');

    const elapsed = Math.max(0, t - greenAt);
    text(ctx, 'TIME', 240, y0 + 18, 8, '#aaa');
    const shown = pFinish !== null ? pFinish : elapsed;
    text(ctx, launched || foul ? shown.toFixed(2) : '0.00', 240, y0 + 32, 16, '#fff');
    if (player.rt !== undefined) {
      text(ctx, `R/T ${player.rt.toFixed(3)}`, 240, y0 + 58, 8, '#aaa');
    }
    if (player.spin && player.v > 0.5) {
      text(ctx, 'WHEELSPIN', 240, y0 + 74, 8, '#ff8a1f');
    }

    const barX = 380;
    const barW = 240;
    text(ctx, rival.name.toUpperCase(), barX, y0 + 14, 8, '#ff9ab0');
    text(ctx, 'YOU', barX, y0 + 50, 8, '#8fd6b4');
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, y0 + 30, barW, 6);
    ctx.fillRect(barX, y0 + 66, barW, 6);
    ctx.fillStyle = '#ff9ab0';
    ctx.fillRect(barX, y0 + 30, Math.min(1, opp.x / QUARTER) * barW, 6);
    ctx.fillStyle = '#8fd6b4';
    ctx.fillRect(barX, y0 + 66, Math.min(1, player.x / QUARTER) * barW, 6);
    if (rFinish !== null) {
      text(ctx, `${rFinish.toFixed(2)}s @ ${Math.round(rMph)}`, barX + barW, y0 + 14, 8, '#ff9ab0', 'right');
    }
    if (pFinish !== null) {
      text(ctx, `${pFinish.toFixed(2)}s @ ${Math.round(pMph)}`, barX + barW, y0 + 50, 8, '#8fd6b4', 'right');
    }
    text(ctx, psp.auto ? 'GAS: ↑/W' : 'GAS: ↑/W   SHIFT: SPACE', barX, y0 + 84, 6, '#777');

    if (t < greenAt && !foul) {
      text(ctx, t < 1.6 ? 'STAGE...' : 'WAIT FOR GREEN', W / 2, 30, 12, '#ffb020', 'center');
    } else if (t < greenAt + 0.8 && !foul) {
      text(ctx, 'GO!', W / 2, 26, 20, '#30ff50', 'center');
    }
    if (t < messageUntil) {
      text(ctx, message, W / 2, 30, 14, '#ff5050', 'center');
    } else if (!psp.auto && player.rpm > psp.redline + 50 && Math.floor(t * 6) % 2 === 0) {
      text(ctx, 'OVER-REV!', W / 2, 30, 14, '#ff5050', 'center');
    }

    if (done) {
      const won = winner === 'player';
      const lines = [];
      if (foul) {
        lines.push('You jumped the light.');
      }
      if (pFinish !== null) {
        lines.push(`You: ${pFinish.toFixed(2)}s @ ${Math.round(pMph)} mph`);
      }
      if (rFinish !== null) {
        lines.push(`${shortName(rival.name)}: ${rFinish.toFixed(2)}s @ ${Math.round(rMph)} mph`);
      }
      lines.push('');
      lines.push('Press SPACE or tap to continue');
      banner(ctx, W, H - 100, won ? 'YOU WIN!' : 'YOU LOSE', lines, won ? '#30ff50' : '#ff5050');
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
      foul,
      blown: player.blown,
      overRev: maxOverRev,
      playerTime: pFinish,
      rivalTime: rFinish,
      playerMph: pMph,
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
      const sub = 4;
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
      banner(ctx, W, H - 100, 'PAUSED', ['Press P to resume']);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return { stop: () => { cancelAnimationFrame(raf); pEngine?.stop(); rEngine?.stop(); } };
};
