export const ENGINES = {
  willys134: { name: 'Willys Go-Devil 134 I4', hp: 63, peak: 4000, redline: 4600, price: 120, forSale: false },
  flat221: { name: 'Ford Flathead V8 221', hp: 90, peak: 3800, redline: 4400, price: 150 },
  flat255: { name: 'Mercury Flathead V8 255', hp: 125, peak: 3800, redline: 4600, price: 260 },
  chevy265: { name: 'Chevy 265 V8', hp: 162, peak: 4400, redline: 5300, price: 320 },
  chevy283: { name: 'Chevy 283 V8', hp: 185, peak: 4600, redline: 5600, price: 420 },
  ford312: { name: 'Ford 312 Y-Block V8', hp: 245, peak: 4500, redline: 5400, price: 480 },
  mopar318: { name: 'Plymouth 318 V-800', hp: 250, peak: 4800, redline: 5600, price: 520 },
  chevy348: { name: 'Chevy 348 W-Motor', hp: 280, peak: 4800, redline: 5800, price: 600 },
  chevy327: { name: 'Chevy 327 V8', hp: 300, peak: 5000, redline: 6000, price: 700 },
  pontiac389: { name: 'Pontiac 389 V8', hp: 318, peak: 4800, redline: 5700, price: 760 },
  chevy409: { name: 'Chevy 409 V8', hp: 380, peak: 5800, redline: 6400, price: 1050 },
  pontiac421: { name: 'Pontiac 421 Super Duty', hp: 405, peak: 5600, redline: 6400, price: 1400 },
  mopar413: { name: 'Chrysler 413 Max Wedge', hp: 420, peak: 5400, redline: 6200, price: 1550 },
  hemi392: { name: 'Chrysler 392 Hemi, race-built', hp: 440, peak: 5800, redline: 6800, price: 2100, boostBonus: 0.15 },
};

export const PARTS = {
  carb: {
    label: 'Induction',
    options: [
      { id: 'stock', name: 'Factory carburetor', price: 0, mult: 1 },
      { id: '4bbl', name: 'Carter AFB 4-barrel', price: 80, mult: 1.07 },
      { id: '3x2', name: 'Tri-Power 3x2 carbs', price: 160, mult: 1.12 },
      { id: '2x4', name: 'Dual quads on a ram manifold', price: 240, mult: 1.17 },
      { id: 'fi', name: 'Hilborn mechanical injection', price: 650, mult: 1.24 },
      { id: 'blower', name: 'GMC 6-71 supercharger', price: 1300, mult: 1.42, wear: 2 },
    ],
  },
  cam: {
    label: 'Camshaft',
    options: [
      { id: 'stock', name: 'Factory cam', price: 0, mult: 1, peakAdd: 0, redAdd: 0 },
      { id: 'street', name: 'Isky 3/4-race cam', price: 90, mult: 1.05, peakAdd: 300, redAdd: 300 },
      { id: 'race', name: 'Engle full-race cam', price: 220, mult: 1.11, peakAdd: 700, redAdd: 700, wear: 1 },
    ],
  },
  headers: {
    label: 'Exhaust',
    options: [
      { id: 'stock', name: 'Cast iron manifolds', price: 0, mult: 1 },
      { id: 'lakes', name: 'Lakes pipes', price: 70, mult: 1.04 },
      { id: 'tuned', name: 'Tuned tube headers', price: 150, mult: 1.08 },
    ],
  },
  ignition: {
    label: 'Ignition',
    options: [
      { id: 'stock', name: 'Factory points', price: 0, mult: 1, redAdd: 0 },
      { id: 'mallory', name: 'Mallory dual-point distributor', price: 65, mult: 1.03, redAdd: 200 },
    ],
  },
  trans: {
    label: 'Transmission',
    options: [
      { id: '3spd', name: '3-speed column shift', price: 0, gears: [2.47, 1.53, 1.0], shift: 0.5 },
      { id: 'glide', name: 'Powerglide 2-speed automatic', price: 180, gears: [1.82, 1.0], shift: 0.2, auto: true },
      { id: 't10', name: 'Borg-Warner T-10 4-speed', price: 260, gears: [2.54, 1.89, 1.51, 1.0], shift: 0.42 },
      { id: 'm21', name: 'Muncie M21 close-ratio 4-speed', price: 380, gears: [2.2, 1.64, 1.27, 1.0], shift: 0.4 },
    ],
  },
  shifter: {
    label: 'Shifter',
    options: [
      { id: 'stock', name: 'Factory linkage', price: 0, shiftMult: 1 },
      { id: 'hurst', name: 'Hurst competition shifter', price: 85, shiftMult: 0.55 },
    ],
  },
  gear: {
    label: 'Rear gear',
    options: [
      { id: '3.08', name: '3.08 highway gears', price: 0, ratio: 3.08 },
      { id: '3.36', name: '3.36 rear gears', price: 0, ratio: 3.36 },
      { id: '3.55', name: '3.55 rear gears', price: 60, ratio: 3.55 },
      { id: '3.73', name: '3.73 rear gears', price: 60, ratio: 3.73 },
      { id: '4.11', name: '4.11 rear gears', price: 70, ratio: 4.11 },
      { id: '4.56', name: '4.56 drag gears', price: 80, ratio: 4.56 },
      { id: '4.88', name: '4.88 drag gears', price: 90, ratio: 4.88 },
    ],
  },
  tires: {
    label: 'Tires',
    options: [
      { id: 'bias', name: 'Bias-ply blackwalls', price: 0, mu: 0.8, r: 0.33 },
      { id: 'wide', name: 'Wide whitewalls', price: 60, mu: 0.88, r: 0.34 },
      { id: 'cheaters', name: 'Cheater slicks', price: 140, mu: 1.02, r: 0.35 },
      { id: 'slicks', name: 'M&H Racemaster slicks', price: 280, mu: 1.22, r: 0.36 },
    ],
  },
  body: {
    label: 'Weight',
    options: [
      { id: 'stock', name: 'Stock interior & panels', price: 0, weight: 0 },
      { id: 'gutted', name: 'Gutted interior', price: 40, weight: -180 },
      { id: 'light', name: 'Gutted + fiberglass front end', price: 340, weight: -340 },
    ],
  },
  tach: {
    label: 'Gauges',
    options: [
      { id: 'none', name: 'Factory gauges', price: 0 },
      { id: 'sun', name: 'Sun tach with shift light', price: 45 },
    ],
  },
};

export const PART_GROUPS = Object.keys(PARTS);

export const DEFAULT_PARTS = {
  carb: 'stock', cam: 'stock', headers: 'stock', ignition: 'stock', trans: '3spd',
  shifter: 'stock', gear: '3.36', tires: 'bias', body: 'stock', tach: 'none',
};

export const MODELS = {
  willys37: { name: "'37 Willys Coupe", weight: 2250, rearBias: 0.68, engine: 'willys134', body: 'gasser', cdA: 0.95, price: 220, stock: { gear: '4.11' } },
  ford32: { name: "'32 Ford Roadster", weight: 2150, engine: 'flat221', body: 'roadster', cdA: 0.9, price: 380, stock: {} },
  ford40: { name: "'40 Ford Coupe", weight: 2800, engine: 'flat221', body: 'coupe', cdA: 0.9, price: 300, stock: {} },
  merc49: { name: "'49 Mercury Coupe", weight: 3350, engine: 'flat255', body: 'lead', cdA: 0.85, price: 420, stock: {} },
  chevy55: { name: "'55 Chevy 210", weight: 3150, engine: 'chevy265', body: 'sedan', cdA: 0.88, price: 650, stock: {} },
  chevy57: { name: "'57 Chevy Bel Air", weight: 3300, engine: 'chevy283', body: 'hardtop', cdA: 0.88, price: 900, stock: { carb: '4bbl' } },
  ford57: { name: "'57 Ford Fairlane", weight: 3450, engine: 'ford312', body: 'hardtop', cdA: 0.88, price: 880, stock: {} },
  fury58: { name: "'58 Plymouth Fury", weight: 3600, engine: 'mopar318', body: 'finned', cdA: 0.86, price: 1050, stock: { carb: '2x4', gear: '3.08' } },
  impala60: { name: "'60 Chevy Impala", weight: 3650, engine: 'chevy348', body: 'finned', cdA: 0.86, price: 1350, stock: { carb: '3x2', gear: '3.08' } },
  catalina62: { name: "'62 Pontiac Catalina", weight: 3700, engine: 'pontiac389', body: 'hardtop', cdA: 0.86, price: 1850, stock: { carb: '3x2', trans: 't10', gear: '3.55' } },
  vette63: { name: "'63 Corvette Sting Ray", weight: 3050, engine: 'chevy327', body: 'sports', cdA: 0.72, price: 3700, stock: { carb: 'fi', trans: 't10', gear: '3.73', tach: 'sun' } },
};

export const COLORS = [
  { name: 'Tuxedo Black', hex: '#1b1b22' },
  { name: 'Roman Red', hex: '#b3202a' },
  { name: 'Candy Apple', hex: '#e0182d' },
  { name: 'Tropical Turquoise', hex: '#2bb3a8' },
  { name: 'Seafoam Green', hex: '#8fd6b4' },
  { name: 'Harbor Blue', hex: '#2b5fa8' },
  { name: 'India Ivory', hex: '#efe6c8' },
  { name: 'Coronado Yellow', hex: '#f2c230' },
  { name: 'Kandy Purple', hex: '#7d2fa6' },
  { name: 'Sierra Gold', hex: '#c79a3b' },
  { name: 'Primer Gray', hex: '#7c7a74' },
  { name: 'Shell Pink', hex: '#f0a6b8' },
];

export const PAINT_PRICE = 60;
export const FLAMES_PRICE = 90;
export const GARAGE_SLOTS = 3;
export const SUMMER_DAYS = 93;
export const RACES_PER_NIGHT = 3;
export const TIER_REP = [0, 0, 8, 20, 36, 52];

const build = (model, engine, parts, color) => ({ model, engine, parts: { ...DEFAULT_PARTS, ...MODELS[model].stock, ...parts }, color });

export const RIVALS = [
  {
    id: 'dewey', name: 'Dewey "Dipstick" Miller', tier: 1, bank: 220, bet: [20, 60], pinks: true, races: ['drag', 'street'], skill: 0.25,
    car: build('ford40', 'flat221', { carb: '4bbl' }, '#5d6b3a'),
    taunt: 'My old man says this flathead could outrun a train. Wanna find out?',
    win: 'Whoo-ee! Tell your mama I said hi.', lose: 'Aw, nuts. The plugs are fouled, I swear.',
  },
  {
    id: 'peggy', name: 'Peggy Sue Harlan', tier: 1, bank: 260, bet: [25, 75], pinks: false, races: ['street', 'drag'], skill: 0.45,
    car: build('merc49', 'flat255', { carb: '3x2', headers: 'lakes' }, '#7d2fa6'),
    taunt: "Daddy's Merc isn't for sale, sugar. But I'll take your lunch money.",
    win: 'Better luck next time, hot shot.', lose: "Don't you dare tell Daddy.",
  },
  {
    id: 'skip', name: 'Skip Tanner', tier: 1, bank: 300, bet: [30, 90], pinks: true, races: ['drag'], skill: 0.4,
    car: build('chevy55', 'chevy265', { carb: '4bbl' }, '#2bb3a8'),
    taunt: "Two-ten with the new V8. Quarter mile at the airstrip, that's my game.",
    win: 'Like I said. Small block, big results.', lose: "Huh. Guess I'm buying the malts.",
  },
  {
    id: 'vince', name: 'Vince "Grease" Romano', tier: 2, bank: 600, bet: [80, 200], pinks: true, races: ['drag', 'street'], skill: 0.55,
    car: build('chevy57', 'chevy283', { carb: '2x4', headers: 'tuned', cam: 'street', trans: 't10', gear: '3.73', tires: 'wide' }, '#1b1b22'),
    taunt: "Careful, kid. This Bel Air's been eatin' punks all summer.",
    win: 'Comb your hair and try again.', lose: 'This ain\'t over. Not by a long shot.',
  },
  {
    id: 'lou', name: 'Lucky Lou Deveraux', tier: 2, bank: 550, bet: [75, 180], pinks: true, races: ['street'], skill: 0.6,
    car: build('ford32', 'chevy283', { carb: '3x2', headers: 'lakes', trans: 't10', gear: '3.73' }, '#b3202a'),
    taunt: "A deuce with a small-block in it. Only thing faster is my luck.",
    win: 'Lucky Lou strikes again!', lose: 'Luck ran out. Happens to the best of us.',
  },
  {
    id: 'earl', name: 'Earl "Hambone" Pruitt', tier: 2, bank: 700, bet: [100, 220], pinks: false, races: ['drag'], skill: 0.5,
    car: build('fury58', 'mopar318', { headers: 'tuned', ignition: 'mallory', gear: '3.73', tires: 'wide' }, '#efe6c8'),
    taunt: 'They call her Christine. Just kiddin\'. Her name is Darlene.',
    win: 'Darlene says thank you.', lose: 'Darlene is very disappointed in me.',
  },
  {
    id: 'johnny', name: 'Johnny Blaze', tier: 3, bank: 1400, bet: [200, 450], pinks: true, races: ['street', 'drag'], skill: 0.7,
    car: build('impala60', 'chevy348', { cam: 'street', headers: 'tuned', trans: 't10', gear: '4.11', tires: 'cheaters', shifter: 'hurst' }, '#e0182d'),
    taunt: "Nobody beats me on the canyon road. Nobody.",
    win: 'Told ya. Nobody.', lose: "Somebody. Huh. Didn't see that coming.",
  },
  {
    id: 'marlene', name: 'Marlene "The Widow" Voss', tier: 3, bank: 1600, bet: [250, 500], pinks: true, races: ['drag'], skill: 0.75,
    car: build('ford57', 'ford312', { carb: 'blower', headers: 'tuned', trans: 't10', gear: '4.11', tires: 'cheaters', body: 'gutted' }, '#1b1b22'),
    taunt: 'My husband built this car. He went off a cliff in it. Shall we?',
    win: 'Run along, dear.', lose: 'Well. Aren\'t you full of surprises.',
  },
  {
    id: 'tommy', name: 'Tommy "Two-Tone" Briggs', tier: 3, bank: 1500, bet: [250, 500], pinks: false, races: ['drag', 'street'], skill: 0.7,
    car: build('catalina62', 'pontiac421', { headers: 'tuned', trans: 'm21', gear: '4.11', tires: 'cheaters', shifter: 'hurst' }, '#2b5fa8'),
    taunt: 'Super Duty, factory lightweight. Pontiac builds excitement, pal.',
    win: 'Wide-track, wide margin.', lose: 'Gonna need a bigger engine. They make a bigger engine?',
  },
  {
    id: 'reese', name: '"Big Daddy" Reese', tier: 4, bank: 3000, bet: [400, 900], pinks: true, races: ['drag'], skill: 0.85,
    car: build('willys37', 'chevy409', { carb: '2x4', cam: 'street', headers: 'tuned', trans: 'm21', shifter: 'hurst', gear: '4.56', tires: 'cheaters', tach: 'sun' }, '#f2c230'),
    taunt: 'Gasser, son. Nose up, four-oh-nine, and you in my mirror. Ain\'t nothin\' else to it.',
    win: 'Ha! Go ask your mama for more money.', lose: 'Well I\'ll be. You got the touch, son.',
  },
  {
    id: 'carlos', name: 'Carlos "El Diablo" Mendez', tier: 4, bank: 3200, bet: [450, 1000], pinks: true, races: ['street', 'drag'], skill: 0.9,
    car: build('vette63', 'chevy409', { carb: '3x2', cam: 'street', headers: 'tuned', ignition: 'mallory', trans: 'm21', shifter: 'hurst', gear: '4.11', tires: 'slicks', body: 'gutted' }, '#c79a3b'),
    taunt: 'The devil drives the canyon at night, amigo. You sure you want to meet him?',
    win: 'Vaya con Dios.', lose: 'Hm. The devil tips his hat to you.',
  },
  {
    id: 'king', name: 'Rex Castellano, "The King"', tier: 5, bank: 6000, bet: [0, 0], pinks: true, pinksOnly: true, races: ['drag', 'street'], skill: 0.95,
    car: build('vette63', 'hemi392', { carb: 'blower', cam: 'race', headers: 'tuned', ignition: 'mallory', trans: 'm21', shifter: 'hurst', gear: '3.55', tires: 'slicks', body: 'light' }, '#1b1b22'),
    taunt: 'So you\'re the one they\'ve been talking about. Pink slips, kid. Nothing else is worth my time.',
    win: 'Long live the King.', lose: 'The crown is yours, kid. Wear it well.',
  },
];

export const SELLERS = [
  'Runs good, needs TLC.', 'Grandma drove it to church on Sundays.', 'Must sell, drafted.', 'Some rust, lotsa heart.',
  'Burns a little oil.', 'New tires last spring.', 'Wife says it goes or I go.', 'Fast. Too fast for me.',
  'Clean title, no tickets (mostly).', 'Ex-moonshine runner. No questions.', 'Built it myself in shop class.',
];

export const PHONE_EXCHANGES = ['OLympic', 'MAdison', 'HOllywood', 'DUnkirk', 'CApitol', 'EXbrook', 'PLeasant'];
export const SELLER_NAMES = ['Bud', 'Hank', 'Dottie', 'Ray', 'Mrs. Kowalski', 'Chet', 'Lloyd', 'Arlene', 'Sarge', 'Duke'];

export const shortName = (name) => (name.startsWith('"') ? name.split('"')[1] : name.split(' ')[0]);
