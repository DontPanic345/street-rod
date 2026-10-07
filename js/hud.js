export const FONT = '"Press Start 2P", monospace';

export const text = (ctx, str, x, y, size = 8, color = '#fff', align = 'left') => {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#000';
  ctx.fillText(str, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
};

export const drawTach = (ctx, cx, cy, r, rpm, sp, runner, time) => {
  const max = Math.ceil((sp.redline + 1200) / 1000) * 1000;
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const angle = (v) => start + (Math.min(v, max) / max) * sweep;

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = '#c0202a';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 4, angle(sp.redline), angle(max));
  ctx.stroke();

  ctx.font = `6px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= max; v += 1000) {
    const a = angle(v);
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
    ctx.lineTo(cx + Math.cos(a) * (r - 1), cy + Math.sin(a) * (r - 1));
    ctx.stroke();
    ctx.fillStyle = v >= sp.redline ? '#ff5a5a' : '#eee';
    ctx.fillText(String(v / 1000), cx + Math.cos(a) * (r - 16), cy + Math.sin(a) * (r - 16));
  }
  ctx.fillStyle = '#888';
  ctx.fillText('x1000', cx, cy + r * 0.45);

  const shiftAt = sp.shiftRpms[runner.gear];
  const light = sp.shiftLight && !sp.auto && shiftAt && rpm >= shiftAt - 150;
  ctx.fillStyle = light ? '#ff3030' : '#401010';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.42, 5, 0, Math.PI * 2);
  ctx.fill();

  const overRev = rpm > sp.redline + 50;
  if (overRev && Math.floor(time * 8) % 2 === 0) {
    ctx.fillStyle = 'rgba(255,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const a = angle(rpm);
  ctx.strokeStyle = '#ff8a1f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
  ctx.stroke();
  ctx.fillStyle = '#ccc';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
};

export const gearLabel = (sp, runner) => {
  if (sp.auto) {
    return runner.gear === 0 ? 'L' : 'D';
  }
  return String(runner.gear + 1);
};

export const banner = (ctx, w, h, title, lines, color = '#ffe14d') => {
  ctx.fillStyle = 'rgba(10,6,30,0.86)';
  const bh = 60 + lines.length * 16;
  const y = h / 2 - bh / 2 - 30;
  ctx.fillRect(40, y, w - 80, bh);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(44, y + 4, w - 88, bh - 8);
  text(ctx, title, w / 2, y + 16, 16, color, 'center');
  lines.forEach((line, i) => text(ctx, line, w / 2, y + 44 + i * 16, 8, '#fff', 'center'));
};
