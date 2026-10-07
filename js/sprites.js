const PROFILES = {
  roadster: {
    lower: [[6, 11], [5, 25], [46, 26], [80, 24], [88, 30], [93, 30], [94, 13], [88, 10]],
    glass: [[47, 26], [51, 37], [53, 37], [50, 26]],
    wheels: [[17, 10], [85, 9]],
  },
  coupe: {
    lower: [[3, 11], [2, 22], [10, 28], [60, 30], [90, 27], [99, 20], [99, 12], [5, 10]],
    glass: [[20, 29], [29, 44], [48, 44], [60, 30]],
    wheels: [[19, 9], [80, 9]],
  },
  lead: {
    lower: [[2, 12], [2, 24], [25, 28], [68, 28], [98, 25], [100, 18], [100, 10], [4, 9]],
    glass: [[24, 28], [32, 38], [54, 38], [66, 28]],
    wheels: [[21, 9], [80, 9]],
  },
  sedan: {
    lower: [[2, 12], [2, 26], [30, 28], [70, 28], [98, 26], [100, 22], [100, 12], [96, 8], [4, 8]],
    glass: [[28, 28], [34, 43], [62, 43], [72, 28]],
    wheels: [[20, 8], [80, 8]],
  },
  hardtop: {
    lower: [[1, 12], [1, 27], [30, 28], [70, 28], [98, 26], [100, 22], [100, 12], [96, 8], [4, 8]],
    glass: [[30, 28], [37, 41], [60, 41], [71, 28]],
    wheels: [[20, 8], [80, 8]],
  },
  finned: {
    lower: [[0, 12], [0, 33], [8, 29], [30, 27], [70, 27], [98, 25], [100, 20], [100, 11], [96, 8], [4, 8]],
    glass: [[32, 27], [40, 39], [62, 39], [74, 27]],
    wheels: [[21, 8], [80, 8]],
  },
  sports: {
    lower: [[0, 12], [0, 24], [28, 26], [70, 25], [100, 17], [100, 11], [96, 8], [4, 8]],
    glass: [[22, 26], [40, 37], [56, 37], [68, 25]],
    wheels: [[20, 8], [78, 8]],
  },
  gasser: {
    lower: [[4, 11], [4, 26], [40, 30], [94, 33], [98, 26], [96, 17], [10, 10]],
    glass: [[24, 30], [29, 46], [50, 46], [58, 31]],
    wheels: [[20, 10], [84, 15, 7]],
  },
};

const shade = (hex, amount) => {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amount));
  const g = clamp(((n >> 8) & 255) * (1 + amount));
  const b = clamp((n & 255) * (1 + amount));
  return `rgb(${r},${g},${b})`;
};

const poly = (ctx, points, ox, oy, s) => {
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const px = ox + x * s;
    const py = oy - y * s;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.closePath();
};

export const drawCarSide = (ctx, body, color, flames, ox, groundY, scale) => {
  const p = PROFILES[body] || PROFILES.sedan;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(ox + 50 * scale, groundY + 1 * scale, 52 * scale, 3 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  poly(ctx, p.glass, ox, groundY, scale);
  ctx.fillStyle = '#9fd3e6';
  ctx.fill();
  ctx.lineWidth = Math.max(1, scale * 1.6);
  ctx.strokeStyle = shade(color, -0.15);
  ctx.stroke();

  poly(ctx, p.lower, ox, groundY, scale);
  const grad = ctx.createLinearGradient(0, groundY - 34 * scale, 0, groundY);
  grad.addColorStop(0, shade(color, 0.35));
  grad.addColorStop(0.45, color);
  grad.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = grad;
  ctx.fill();

  if (flames) {
    ctx.save();
    poly(ctx, p.lower, ox, groundY, scale);
    ctx.clip();
    const flameColors = ['#ff3b1f', '#ff9a1f', '#ffe14d'];
    flameColors.forEach((fc, layer) => {
      ctx.fillStyle = fc;
      ctx.beginPath();
      const top = 24 - layer * 2;
      ctx.moveTo(ox + 100 * scale, groundY - (top + 4) * scale);
      for (let i = 0; i < 5; i++) {
        const x = 96 - i * 10 - layer * 3;
        ctx.quadraticCurveTo(ox + (x - 4) * scale, groundY - (top + 3) * scale, ox + (x - 14 + layer * 2) * scale, groundY - (top - 1 - (i % 2) * 2) * scale);
        ctx.quadraticCurveTo(ox + (x - 8) * scale, groundY - (top - 4) * scale, ox + (x - 6) * scale, groundY - (top - 6) * scale);
      }
      ctx.lineTo(ox + 100 * scale, groundY - (top - 10) * scale);
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  ctx.moveTo(ox + 8 * scale, groundY - 18 * scale);
  ctx.lineTo(ox + 92 * scale, groundY - 18 * scale);
  ctx.stroke();

  ctx.fillStyle = '#ddd';
  ctx.fillRect(ox - 1 * scale, groundY - 13 * scale, 4 * scale, 3 * scale);
  ctx.fillRect(ox + 97 * scale, groundY - 13 * scale, 4 * scale, 3 * scale);

  p.wheels.forEach(([x, y, r = 9]) => {
    const cx = ox + x * scale;
    const cy = groundY - y * scale;
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b8b8b8';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

export const drawCarTop = (ctx, x, y, len, wid, color, body, flames) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-len / 2 + 3, -wid / 2 + 3, len, wid);
  ctx.fillStyle = '#111';
  const tw = len * 0.16;
  const th = wid * 0.18;
  [[-len * 0.3, -wid / 2 - th * 0.3], [-len * 0.3, wid / 2 - th * 0.7], [len * 0.3, -wid / 2 - th * 0.3], [len * 0.3, wid / 2 - th * 0.7]].forEach(([wx, wy]) => {
    ctx.fillRect(wx - tw / 2, wy, tw, th);
  });
  const grad = ctx.createLinearGradient(0, -wid / 2, 0, wid / 2);
  grad.addColorStop(0, shade(color, 0.3));
  grad.addColorStop(0.5, color);
  grad.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, wid * 0.3);
  ctx.fill();
  if (flames) {
    ctx.fillStyle = '#ff8a1f';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(len / 2 - 2, -wid * 0.35 + i * wid * 0.35);
      ctx.lineTo(len * 0.05, -wid * 0.3 + i * wid * 0.3);
      ctx.lineTo(len / 2 - 2, -wid * 0.2 + i * wid * 0.35);
      ctx.fill();
    }
  }
  if (body === 'roadster') {
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(-len * 0.2, -wid * 0.32, len * 0.22, wid * 0.64);
    ctx.fillStyle = '#9fd3e6';
    ctx.fillRect(len * 0.04, -wid * 0.36, len * 0.03, wid * 0.72);
  } else {
    ctx.fillStyle = '#7fb2c8';
    ctx.fillRect(-len * 0.24, -wid * 0.36, len * 0.44, wid * 0.72);
    ctx.fillStyle = shade(color, 0.1);
    ctx.fillRect(-len * 0.17, -wid * 0.34, len * 0.27, wid * 0.68);
  }
  if (body === 'gasser') {
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(len * 0.25, -wid * 0.15, len * 0.12, wid * 0.3);
  }
  ctx.fillStyle = '#fff6b0';
  ctx.fillRect(len / 2 - 3, -wid * 0.42, 3, wid * 0.18);
  ctx.fillRect(len / 2 - 3, wid * 0.24, 3, wid * 0.18);
  ctx.fillStyle = '#d0202a';
  ctx.fillRect(-len / 2, -wid * 0.42, 2, wid * 0.16);
  ctx.fillRect(-len / 2, wid * 0.26, 2, wid * 0.16);
  ctx.restore();
};

export const drawCarFront = (ctx, cx, bottom, w, color) => {
  const h = w * 0.42;
  const x = cx - w / 2;
  const y = bottom - h;
  ctx.fillStyle = '#111';
  ctx.fillRect(x + w * 0.04, bottom - h * 0.32, w * 0.18, h * 0.32);
  ctx.fillRect(x + w * 0.78, bottom - h * 0.32, w * 0.18, h * 0.32);
  ctx.fillStyle = shade(color, -0.1);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.14, y + h * 0.12);
  ctx.lineTo(x + w * 0.24, y - h * 0.38);
  ctx.lineTo(x + w * 0.76, y - h * 0.38);
  ctx.lineTo(x + w * 0.86, y + h * 0.12);
  ctx.fill();
  ctx.fillStyle = '#5a7a8c';
  ctx.fillRect(x + w * 0.24, y - h * 0.3, w * 0.52, h * 0.36);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.1, w, h * 0.7, h * 0.12);
  ctx.fill();
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(x + w * 0.25, y + h * 0.32, w * 0.5, h * 0.22);
  ctx.fillStyle = '#fff6b0';
  ctx.beginPath();
  ctx.arc(x + w * 0.12, y + h * 0.4, h * 0.11, 0, Math.PI * 2);
  ctx.arc(x + w * 0.88, y + h * 0.4, h * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,246,176,0.18)';
  ctx.beginPath();
  ctx.arc(x + w * 0.12, y + h * 0.4, h * 0.4, 0, Math.PI * 2);
  ctx.arc(x + w * 0.88, y + h * 0.4, h * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(x - w * 0.02, y + h * 0.66, w * 1.04, h * 0.12);
};

export const drawCarRear = (ctx, cx, bottom, w, color, body, braking) => {
  const h = w * 0.42;
  const x = cx - w / 2;
  const y = bottom - h;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x - w * 0.02, bottom - h * 0.08, w * 1.04, h * 0.12);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + w * 0.04, bottom - h * 0.32, w * 0.18, h * 0.32);
  ctx.fillRect(x + w * 0.78, bottom - h * 0.32, w * 0.18, h * 0.32);

  const cabinTop = body === 'roadster' ? y + h * 0.15 : y - h * 0.38;
  if (body !== 'roadster') {
    ctx.fillStyle = shade(color, -0.1);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.14, y + h * 0.12);
    ctx.lineTo(x + w * 0.24, cabinTop);
    ctx.lineTo(x + w * 0.76, cabinTop);
    ctx.lineTo(x + w * 0.86, y + h * 0.12);
    ctx.fill();
    ctx.fillStyle = '#28323c';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.2, y + h * 0.08);
    ctx.lineTo(x + w * 0.27, cabinTop + h * 0.08);
    ctx.lineTo(x + w * 0.73, cabinTop + h * 0.08);
    ctx.lineTo(x + w * 0.8, y + h * 0.08);
    ctx.fill();
  } else {
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(x + w * 0.3, cabinTop - h * 0.1, w * 0.4, h * 0.2);
  }

  const grad = ctx.createLinearGradient(0, y, 0, bottom);
  grad.addColorStop(0, shade(color, 0.3));
  grad.addColorStop(1, shade(color, -0.45));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(x, y + h * 0.1, w, h * 0.7, h * 0.12);
  ctx.fill();
  if (body === 'finned') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.2);
    ctx.lineTo(x + w * 0.04, y - h * 0.2);
    ctx.lineTo(x + w * 0.1, y + h * 0.2);
    ctx.moveTo(x + w, y + h * 0.2);
    ctx.lineTo(x + w * 0.96, y - h * 0.2);
    ctx.lineTo(x + w * 0.9, y + h * 0.2);
    ctx.fill();
  }
  ctx.fillStyle = braking ? '#ff2a2a' : '#8a1010';
  ctx.fillRect(x + w * 0.05, y + h * 0.3, w * 0.12, h * 0.16);
  ctx.fillRect(x + w * 0.83, y + h * 0.3, w * 0.12, h * 0.16);
  if (braking) {
    ctx.fillStyle = 'rgba(255,40,40,0.25)';
    ctx.fillRect(x - w * 0.02, y + h * 0.22, w * 0.24, h * 0.32);
    ctx.fillRect(x + w * 0.78, y + h * 0.22, w * 0.24, h * 0.32);
  }
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(x - w * 0.02, y + h * 0.66, w * 1.04, h * 0.12);
  ctx.fillStyle = '#efe08a';
  ctx.fillRect(cx - w * 0.08, y + h * 0.48, w * 0.16, h * 0.12);
};

export const drawPine = (ctx, x, bottom, w, h) => {
  ctx.fillStyle = '#3b2616';
  ctx.fillRect(x - w * 0.06, bottom - h * 0.2, w * 0.12, h * 0.2);
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    ctx.fillStyle = i % 2 ? '#1d4a2c' : '#245c35';
    const top = bottom - h + (h * 0.25 * i);
    const base = bottom - h * 0.15 - h * 0.22 * (layers - 1 - i);
    const half = w * (0.3 + 0.1 * i);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + half, base);
    ctx.lineTo(x - half, base);
    ctx.fill();
  }
};

export const drawRock = (ctx, x, bottom, w, h) => {
  ctx.fillStyle = '#6b5a4c';
  ctx.beginPath();
  ctx.moveTo(x - w / 2, bottom);
  ctx.lineTo(x - w * 0.4, bottom - h * 0.6);
  ctx.lineTo(x - w * 0.1, bottom - h);
  ctx.lineTo(x + w * 0.3, bottom - h * 0.8);
  ctx.lineTo(x + w / 2, bottom);
  ctx.fill();
  ctx.fillStyle = '#857261';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, bottom - h * 0.6);
  ctx.lineTo(x - w * 0.1, bottom - h);
  ctx.lineTo(x, bottom - h * 0.4);
  ctx.fill();
};

export const drawSign = (ctx, x, bottom, w, h, dir) => {
  ctx.fillStyle = '#555';
  ctx.fillRect(x - w * 0.05, bottom - h * 0.6, w * 0.1, h * 0.6);
  ctx.fillStyle = '#f2c230';
  ctx.save();
  ctx.translate(x, bottom - h * 0.75);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-w * 0.3, -w * 0.3, w * 0.6, w * 0.6);
  ctx.restore();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.beginPath();
  const cy = bottom - h * 0.75;
  ctx.moveTo(x - dir * w * 0.15, cy + w * 0.15);
  ctx.lineTo(x - dir * w * 0.15, cy - w * 0.05);
  ctx.quadraticCurveTo(x - dir * w * 0.15, cy - w * 0.12, x + dir * w * 0.05, cy - w * 0.12);
  ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(x + dir * w * 0.17, cy - w * 0.12);
  ctx.lineTo(x + dir * w * 0.04, cy - w * 0.22);
  ctx.lineTo(x + dir * w * 0.04, cy - w * 0.02);
  ctx.fill();
};

export const drawBillboard = (ctx, x, bottom, w, h, text) => {
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - w * 0.35, bottom - h * 0.5, w * 0.06, h * 0.5);
  ctx.fillRect(x + w * 0.29, bottom - h * 0.5, w * 0.06, h * 0.5);
  ctx.fillStyle = '#efe6c8';
  ctx.fillRect(x - w / 2, bottom - h, w, h * 0.55);
  ctx.fillStyle = '#b3202a';
  ctx.fillRect(x - w / 2 + w * 0.03, bottom - h + h * 0.05, w * 0.94, h * 0.45);
  if (w > 40) {
    ctx.fillStyle = '#ffe14d';
    ctx.font = `${Math.floor(h * 0.16)}px "Press Start 2P", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, bottom - h * 0.73, w * 0.9);
  }
};

export const drawPost = (ctx, x, bottom, w, h) => {
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x - w / 2, bottom - h, w, h);
  ctx.fillStyle = '#d0202a';
  ctx.fillRect(x - w / 2, bottom - h, w, h * 0.15);
};
