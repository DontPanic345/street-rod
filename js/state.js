import {
  COLORS, DEFAULT_PARTS, ENGINES, GARAGE_SLOTS, MODELS, PARTS, PART_GROUPS, PHONE_EXCHANGES, RACES_PER_NIGHT,
  RIVALS, SELLERS, SELLER_NAMES, SUMMER_DAYS, TIER_REP,
} from './data.js';
import { partOf } from './physics.js';

const SAVE_KEY = 'streetrod63.save.v1';
const START_DAY = new Date(1963, 5, 1);

export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;

const seeded = (seed) => {
  let x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

let uid = Date.now();
const nextId = () => `c${(uid++).toString(36)}`;

export const makeCar = (model, extra = {}) => ({
  id: nextId(),
  model,
  engine: MODELS[model].engine,
  parts: { ...DEFAULT_PARTS, ...MODELS[model].stock },
  color: pick(COLORS).hex,
  flames: false,
  condition: 100,
  ...extra,
});

export const dateLabel = (day) => {
  const d = new Date(START_DAY);
  d.setDate(d.getDate() + day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const daysLeft = (state) => Math.max(0, SUMMER_DAYS - state.day);

const partsValue = (car) => PART_GROUPS.reduce((sum, g) => sum + partOf(car, g).price, 0);

export const carValue = (car) => {
  const base = MODELS[car.model].price * (0.55 + car.condition / 220);
  const engineBonus = Math.max(0, ENGINES[car.engine].price - ENGINES[MODELS[car.model].engine].price) * 0.7;
  return Math.round(base + engineBonus + partsValue(car) * 0.55);
};

export const sellPrice = (car) => Math.round(carValue(car) * 0.75);

export const repairCost = (car) => {
  const enginePrice = ENGINES[car.engine].price;
  if (car.condition <= 0) {
    return Math.max(120, Math.round(enginePrice * 0.6));
  }
  return Math.round(((100 - car.condition) * Math.max(150, enginePrice)) / 160);
};

export const tradeIn = (car, group) => Math.round(partOf(car, group).price * 0.25);

const makeListing = () => {
  const weights = { willys37: 3, ford32: 2, ford40: 4, merc49: 3, chevy55: 4, chevy57: 3, ford57: 3, fury58: 2, impala60: 2, catalina62: 1, vette63: 1 };
  const bag = Object.entries(weights).flatMap(([id, w]) => Array(w).fill(id));
  const model = pick(bag);
  const condition = Math.round(rand(45, 96));
  const car = makeCar(model, { condition });
  if (Math.random() < 0.35) {
    const group = pick(['carb', 'headers', 'tires', 'gear', 'cam']);
    car.parts[group] = pick(PARTS[group].options.slice(1, 3)).id;
  }
  const price = Math.round((carValue(car) * rand(0.85, 1.15)) / 5) * 5;
  return {
    car,
    price,
    blurb: pick(SELLERS),
    contact: `${pick(SELLER_NAMES)}, ${pick(PHONE_EXCHANGES)} ${Math.floor(rand(2, 9))}-${Math.floor(rand(1000, 9999))}`,
  };
};

export const refreshClassifieds = (state) => {
  const listings = Array.from({ length: 5 }, makeListing);
  if (!listings.some((l) => l.price <= 400)) {
    const cheap = makeListing();
    cheap.car = makeCar(pick(['ford40', 'willys37']), { condition: Math.round(rand(50, 70)) });
    cheap.price = Math.round((carValue(cheap.car) * 0.9) / 5) * 5;
    listings[4] = cheap;
  }
  state.classifieds = listings;
};

export const newGame = () => {
  const state = {
    version: 1,
    day: 0,
    cash: 750,
    rep: 0,
    cars: [],
    activeCarId: null,
    racesTonight: 0,
    racedTonight: [],
    gone: [],
    record: {},
    stats: { wins: 0, losses: 0, earned: 0, pinksWon: 0, tickets: 0 },
    king: false,
    summerOver: false,
    sound: true,
    log: ['Summer, 1963. School\'s out, you\'ve got $750 in your pocket and something to prove.'],
  };
  refreshClassifieds(state);
  return state;
};

export const save = (state) => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: play continues without persistence
  }
};

export const load = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSave = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
};

export const activeCar = (state) => state.cars.find((c) => c.id === state.activeCarId) || null;

export const garageFull = (state) => state.cars.length >= GARAGE_SLOTS;

export const addCar = (state, car) => {
  state.cars.push(car);
  if (!state.activeCarId) {
    state.activeCarId = car.id;
  }
};

export const removeCar = (state, id) => {
  state.cars = state.cars.filter((c) => c.id !== id);
  if (state.activeCarId === id) {
    state.activeCarId = state.cars[0]?.id || null;
  }
};

export const tierUnlocked = (state, tier) => {
  if (tier === 5) {
    const fourth = RIVALS.filter((r) => r.tier === 4);
    return state.rep >= TIER_REP[5] && fourth.every((r) => (state.record[r.id]?.w || 0) > 0 || state.gone.includes(r.id));
  }
  return state.rep >= TIER_REP[tier];
};

export const rivalPresent = (state, rival) => {
  if (state.gone.includes(rival.id)) {
    return false;
  }
  if (rival.tier === 5) {
    return true;
  }
  return seeded(state.day * 31 + rival.id.length * 7 + rival.tier) < 0.78;
};

export const rivalBank = (state, rival) => state.banks?.[rival.id] ?? rival.bank;

export const advanceDay = (state, message) => {
  state.day += 1;
  state.racesTonight = 0;
  state.racedTonight = [];
  if (state.day % 3 === 0) {
    refreshClassifieds(state);
  }
  if (message) {
    state.log.unshift(message);
  }
  state.log = state.log.slice(0, 8);
  if (state.day >= SUMMER_DAYS && !state.summerOver) {
    state.summerOver = true;
  }
};

export const racesLeft = (state) => RACES_PER_NIGHT - state.racesTonight;
