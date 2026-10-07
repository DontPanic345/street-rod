const held = new Set();
const pressed = new Set();

const KEYMAP = {
  ArrowUp: 'gas', KeyW: 'gas',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'shiftUp', KeyE: 'shiftUp', ShiftLeft: 'shiftUp', ShiftRight: 'shiftUp',
  KeyQ: 'shiftDown', KeyZ: 'shiftDown',
  KeyP: 'pause', Escape: 'pause',
};

let active = false;

const onDown = (e) => {
  const action = KEYMAP[e.code];
  if (!active || !action) {
    return;
  }
  e.preventDefault();
  if (!held.has(action)) {
    pressed.add(action);
  }
  held.add(action);
};

const onUp = (e) => {
  const action = KEYMAP[e.code];
  if (action) {
    held.delete(action);
  }
};

window.addEventListener('keydown', onDown);
window.addEventListener('keyup', onUp);
window.addEventListener('blur', () => held.clear());

export const input = {
  setActive(value) {
    active = value;
    held.clear();
    pressed.clear();
  },
  isActive: () => active,
  held: (action) => held.has(action),
  take(action) {
    const was = pressed.has(action);
    pressed.delete(action);
    return was;
  },
  press(action) {
    if (!held.has(action)) {
      pressed.add(action);
    }
    held.add(action);
  },
  release(action) {
    held.delete(action);
  },
};

export const touchControls = (layout) => {
  const wrap = document.createElement('div');
  wrap.className = 'touch';
  const buttons = layout === 'street'
    ? [['left', '◀'], ['right', '▶'], ['shiftDown', 'GEAR−'], ['shiftUp', 'GEAR+'], ['brake', 'BRAKE'], ['gas', 'GAS']]
    : [['shiftUp', 'SHIFT'], ['gas', 'GAS']];
  buttons.forEach(([action, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = `touch-${action}`;
    const down = (e) => {
      e.preventDefault();
      input.press(action);
      b.classList.add('on');
    };
    const up = (e) => {
      e.preventDefault();
      input.release(action);
      b.classList.remove('on');
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    wrap.appendChild(b);
  });
  return wrap;
};
