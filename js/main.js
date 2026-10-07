import { cash as cashSound, isMuted, setMuted, unlock } from './audio.js';
import {
  COLORS, ENGINES, FLAMES_PRICE, shortName, GARAGE_SLOTS, MODELS, PAINT_PRICE, PARTS, RACES_PER_NIGHT, RIVALS, SUMMER_DAYS, TIER_REP,
} from './data.js';
import { startDrag } from './drag.js';
import { input, touchControls } from './input.js';
import { buildSpec, estimate, partOf, topSpeed } from './physics.js';
import { drawCarSide } from './sprites.js';
import {
  activeCar, addCar, advanceDay, carValue, clearSave, dateLabel, daysLeft, garageFull, load, makeCar, money, newGame,
  pick, racesLeft, rand, removeCar, repairCost, rivalBank, rivalPresent, save, sellPrice, tierUnlocked, tradeIn,
} from './state.js';
import { startStreet } from './street.js';

const root = document.getElementById('screen');
let S = load();
const ui = { screen: 'title', garageCar: null, shopTab: 'engine', challenge: null, lookAt: null, result: null, notice: null };
let race = null;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rivalById = (id) => RIVALS.find((r) => r.id === id);
const stars = (tier) => '★'.repeat(tier) + '☆'.repeat(5 - tier);
const persist = () => save(S);

const fmtEt = (car) => {
  const e = estimate(buildSpec(car));
  return e ? `${e.et.toFixed(2)}s @ ${Math.round(e.mph)}` : 'BLOWN';
};

const btn = (label, act, { arg = '', key = '', cls = '', disabled = false, title = '' } = {}) => `<button type="button" class="btn ${cls}" data-act="${act}" data-arg="${esc(arg)}"${key ? ` data-key="${key}"` : ''}${disabled ? ' disabled' : ''}${title ? ` title="${esc(title)}"` : ''}>${key && key.length === 1 ? `<span class="hk">${key}</span>` : ''}${label}</button>`;

const header = () => {
  const car = activeCar(S);
  return `<header class="status">
    <div><span class="lbl">DATE</span> ${dateLabel(S.day)}</div>
    <div><span class="lbl">CASH</span> <b class="cash">${money(S.cash)}</b></div>
    <div><span class="lbl">REP</span> ${S.rep}</div>
    <div><span class="lbl">SUMMER</span> ${S.summerOver ? 'ENDLESS' : `${daysLeft(S)} days left`}</div>
    <div class="carname"><span class="lbl">RIDE</span> ${car ? esc(MODELS[car.model].name) : '<i>on foot</i>'}</div>
    <button type="button" class="mute" data-act="mute" title="Toggle sound (M)">${isMuted() ? '♪ OFF' : '♪ ON'}</button>
  </header>`;
};

const profileCanvas = (kind, id, w = 320, h = 120) => `<canvas class="profile" width="${w}" height="${h}" data-${kind}="${esc(id)}"></canvas>`;

const statTable = (car) => {
  const sp = buildSpec(car);
  const rows = [
    ['Engine', ENGINES[car.engine].name],
    ['Power', `${Math.round(sp.hp)} hp @ ${sp.peakRpm} rpm`],
    ['Redline', `${sp.redline} rpm`],
    ['Weight', `${Math.round((sp.mass - 75) / 0.4536)} lb`],
    ['Induction', partOf(car, 'carb').name],
    ['Cam', partOf(car, 'cam').name],
    ['Exhaust', partOf(car, 'headers').name],
    ['Trans', `${partOf(car, 'trans').name}${car.parts.shifter === 'hurst' ? ' + Hurst' : ''}`],
    ['Rear gear', partOf(car, 'gear').ratio.toFixed(2)],
    ['Tires', partOf(car, 'tires').name],
    ['Condition', `${Math.round(car.condition)}%${car.condition <= 0 ? ' — BLOWN' : ''}`],
    ['Est. 1/4 mile', fmtEt(car)],
    ['Top speed', `${Math.round(topSpeed(sp))} mph`],
  ];
  return `<table class="stats">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('')}</table>`;
};

// ---------- screens ----------

const titleScreen = () => `
  <div class="title">
    <h1 class="logo">STREET ROD<span>'63</span></h1>
    <p class="tag">An unofficial tribute to the 1989 DOS classic.</p>
    ${profileCanvas('demo', 'title', 480, 150)}
    <div class="menu center">
      ${S ? btn('Continue', 'continue', { key: '1', cls: 'big' }) : ''}
      ${btn('New game', 'new', { key: S ? '2' : '1', cls: 'big' })}
      ${btn('How to play', 'help', { key: 'H' })}
    </div>
    <p class="small">Summer 1963 in Paloma Valley, California. Buy a junker, build it up, beat every hot-rodder at the Tip-Top Drive-In,<br>and take The King's pink slip before Labor Day.</p>
    <p class="small dim">For Cyvster. Made with Claude.</p>
  </div>`;

const helpScreen = () => `
  ${S ? header() : ''}
  <section class="panel">
    <h2>HOW TO PLAY</h2>
    <ul class="help">
      <li><b>The goal:</b> beat The King for his pink slip before Labor Day (${SUMMER_DAYS} days). After that you can keep playing.</li>
      <li><b>Classifieds</b> sell used cars. Your garage holds ${GARAGE_SLOTS}.</li>
      <li><b>Hal's Speed Shop</b> sells engines and parts. Each item shows the estimated quarter-mile time it would give you. You get 25% trade-in on the part you replace.</li>
      <li><b>The Tip-Top Drive-In</b> is where you race, up to ${RACES_PER_NIGHT} times a night. Win to build your rep. Higher rep brings tougher racers to the table. Some will race for pink slips.</li>
      <li><b>Drag races</b> run a quarter mile at the old airstrip. Hit GAS <i>on</i> the green light. If you jump it, you lose. Shift with SPACE near redline. A Sun tach adds a shift light. Too long past redline and you'll blow the engine.</li>
      <li><b>Street races</b> run down Devil's Canyon Road. Steer with ←/→, brake with ↓, shift down with Q. Watch for slow traffic in your lane and oncoming cars in the other one.</li>
      <li>Racing wears your car. Fix it in your garage. Too broke? Pump gas at Sal's.</li>
      <li>Keys: ↑/W gas · ↓/S brake · ←→/AD steer · SPACE/E shift up · Q/Z shift down · P pause · M mute. Menus have number hotkeys. Touch controls show up on phones.</li>
    </ul>
    <div class="menu">${btn('Back', 'back', { key: 'Escape' })}</div>
  </section>`;

const hubScreen = () => {
  const car = activeCar(S);
  return `${header()}
  <div class="cols">
    <section class="panel">
      <h2>PALOMA VALLEY</h2>
      <div class="menu">
        ${btn('Your garage', 'go', { arg: 'garage', key: '1' })}
        ${btn("Hal's Speed Shop", 'go', { arg: 'shop', key: '2', disabled: !car })}
        ${btn('Valley Gazette classifieds', 'go', { arg: 'classifieds', key: '3' })}
        ${btn('Tip-Top Drive-In (race tonight)', 'go', { arg: 'drivein', key: '4', cls: 'hot' })}
        ${btn("Pump gas at Sal's (ends the day)", 'work', { key: '5' })}
        ${btn('Call it a night', 'sleep', { key: '6' })}
        ${btn('How to play', 'help', { key: 'H' })}
        ${btn('Quit to title', 'title', { key: 'Escape' })}
      </div>
    </section>
    <section class="panel">
      ${car ? `<h2>${esc(MODELS[car.model].name)}</h2>${profileCanvas('profile', car.id)}
        <p>Est. 1/4 mile: <b>${fmtEt(car)}</b> · Condition ${Math.round(car.condition)}%</p>`
        : '<h2>NO RIDE</h2><p>You need wheels. Check the classifieds.</p>'}
      <h3>GOSSIP</h3>
      <ul class="log">${S.log.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    </section>
  </div>`;
};

const garageScreen = () => {
  if (!S.cars.length) {
    return `${header()}<section class="panel"><h2>YOUR GARAGE</h2><p>Just an oil stain and a calendar. Buy a car from the classifieds.</p>
      <div class="menu">${btn('Classifieds', 'go', { arg: 'classifieds', key: '1' })}${btn('Back', 'go', { arg: 'hub', key: 'Escape' })}</div></section>`;
  }
  const car = S.cars.find((c) => c.id === ui.garageCar) || activeCar(S) || S.cars[0];
  ui.garageCar = car.id;
  const isActive = car.id === S.activeCarId;
  const cost = repairCost(car);
  return `${header()}
  <section class="panel">
    <h2>YOUR GARAGE <small>${S.cars.length}/${GARAGE_SLOTS} stalls</small></h2>
    <div class="tabs">${S.cars.map((c, i) => btn(`${MODELS[c.model].name}${c.id === S.activeCarId ? ' ★' : ''}`, 'garagePick', { arg: c.id, key: String(i + 1), cls: c.id === car.id ? 'on' : '' })).join('')}</div>
    <div class="cols">
      <div>
        ${profileCanvas('profile', car.id, 400, 150)}
        <div class="menu">
          ${isActive ? '<p class="ok">★ This is your race car.</p>' : btn('Make this my race car', 'setActive', { arg: car.id, key: 'R' })}
          ${btn(car.condition >= 100 ? 'Repair (nothing to fix)' : `Repair to 100% — ${money(cost)}`, 'repair', { arg: car.id, disabled: car.condition >= 100 || S.cash < cost, key: 'F' })}
          ${btn(`Sell for ${money(sellPrice(car))}`, 'sell', { arg: car.id, key: 'S' })}
        </div>
        <h3>PAINT SHOP — ${money(PAINT_PRICE)}</h3>
        <div class="swatches">${COLORS.map((c) => `<button type="button" class="swatch${c.hex === car.color ? ' on' : ''}" style="background:${c.hex}" title="${c.name}" data-act="paint" data-arg="${c.hex}"${S.cash < PAINT_PRICE ? ' disabled' : ''}></button>`).join('')}</div>
        ${btn(car.flames ? 'Remove flames (free)' : `Paint on flames — ${money(FLAMES_PRICE)}`, 'flames', { arg: car.id, disabled: !car.flames && S.cash < FLAMES_PRICE })}
      </div>
      <div>${statTable(car)}</div>
    </div>
    <div class="menu">${btn('Back to town', 'go', { arg: 'hub', key: 'Escape' })}</div>
  </section>`;
};

const SHOP_TABS = ['engine', 'carb', 'cam', 'headers', 'ignition', 'trans', 'shifter', 'gear', 'tires', 'body', 'tach'];

const shopScreen = () => {
  const car = activeCar(S);
  const current = estimate(buildSpec(car));
  const tab = ui.shopTab;
  let rows;
  if (tab === 'engine') {
    rows = Object.entries(ENGINES).filter(([, e]) => e.forSale !== false).map(([id, e]) => {
      const installed = car.engine === id;
      const trade = Math.round(ENGINES[car.engine].price * 0.25);
      const price = Math.max(0, e.price - trade);
      const trial = { ...car, engine: id, condition: 100 };
      return { id, name: e.name, desc: `${e.hp} hp @ ${e.peak}`, price, installed, trial };
    });
  } else {
    rows = PARTS[tab].options.map((o) => {
      const installed = car.parts[tab] === o.id;
      const price = Math.max(0, o.price - tradeIn(car, tab));
      const trial = { ...car, parts: { ...car.parts, [tab]: o.id } };
      let desc = '';
      if (o.mult && o.mult !== 1) {
        desc = `+${Math.round((o.mult - 1) * 100)}% power`;
      }
      if (o.gears) {
        desc = o.auto ? 'Automatic, no shifting' : `${o.gears.length}-speed, shift time ${o.shift}s`;
      }
      if (o.mu) {
        desc = `Grip ${o.mu.toFixed(2)}`;
      }
      if (o.weight) {
        desc = `${o.weight} lb`;
      }
      if (o.wear) {
        desc += ' · extra wear';
      }
      if (o.id === 'sun') {
        desc = 'Shift light in the tach';
      }
      if (o.id === 'hurst') {
        desc = 'Much faster shifts';
      }
      return { id: o.id, name: o.name, desc, price, installed, trial };
    });
  }
  const tabLabel = (t) => (t === 'engine' ? 'Engine' : PARTS[t].label);
  return `${header()}
  <section class="panel">
    <h2>HAL'S SPEED SHOP <small>Working on: ${esc(MODELS[car.model].name)} — now ${current ? `${current.et.toFixed(2)}s` : 'BLOWN'}</small></h2>
    <div class="tabs">${SHOP_TABS.map((t, i) => btn(tabLabel(t), 'shopTab', { arg: t, cls: t === tab ? 'on' : '', key: i < 9 ? String(i + 1) : '' })).join('')}</div>
    <table class="shop">
      <tr><th>Part</th><th></th><th>Est. 1/4</th><th>Price</th><th></th></tr>
      ${rows.map((r) => {
        const e = estimate(buildSpec(r.trial));
        let delta = '';
        if (e && current && !r.installed) {
          const d = e.et - current.et;
          delta = `<span class="${d < -0.005 ? 'good' : d > 0.005 ? 'bad' : 'dim'}">${d > 0 ? '+' : ''}${d.toFixed(2)}</span>`;
        }
        return `<tr class="${r.installed ? 'installed' : ''}">
          <td>${esc(r.name)}</td><td class="dim">${esc(r.desc)}</td>
          <td>${e ? e.et.toFixed(2) : '—'} ${delta}</td>
          <td>${r.installed ? '' : money(r.price)}</td>
          <td>${r.installed ? '<span class="ok">INSTALLED</span>' : btn('Buy', 'buy', { arg: `${tab}:${r.id}`, disabled: S.cash < r.price })}</td>
        </tr>`;
      }).join('')}
    </table>
    <p class="small dim">Prices include 25% trade-in on the part you take off. ${tab === 'engine' ? 'A new engine resets the car to 100% condition.' : ''}</p>
    <div class="menu">${btn('Back to town', 'go', { arg: 'hub', key: 'Escape' })}</div>
  </section>`;
};

const classifiedsScreen = () => `${header()}
  <section class="panel paper">
    <h2>THE VALLEY GAZETTE — AUTOS FOR SALE</h2>
    <p class="small">New listings every 3 days. Garage: ${S.cars.length}/${GARAGE_SLOTS}</p>
    <div class="listings">
      ${S.classifieds.length ? S.classifieds.map((l, i) => `
        <article class="ad">
          ${profileCanvas('listing', String(i), 260, 90)}
          <h3>${esc(MODELS[l.car.model].name.toUpperCase())}</h3>
          <p>${esc(ENGINES[l.car.engine].name)}. ${esc(l.blurb)} Cond. ${l.car.condition}%.</p>
          <p class="small">1/4 mi est. ${fmtEt(l.car)}</p>
          <p><b>${money(l.price)}</b> — call ${esc(l.contact)}</p>
          ${btn(garageFull(S) ? 'Garage full' : 'Buy it', 'buyCar', { arg: String(i), key: String(i + 1), disabled: S.cash < l.price || garageFull(S) })}
        </article>`).join('') : '<p>Slim pickings. Check back in a few days.</p>'}
    </div>
    <div class="menu">${btn('Back to town', 'go', { arg: 'hub', key: 'Escape' })}</div>
  </section>`;

const driveInScreen = () => {
  const car = activeCar(S);
  const left = racesLeft(S);
  let hotkey = 0;
  const rows = RIVALS.filter((r) => !S.gone.includes(r.id)).map((r) => {
    const unlocked = tierUnlocked(S, r.tier);
    const present = rivalPresent(S, r);
    const rec = S.record[r.id] || { w: 0, l: 0 };
    let status = '';
    let action = '';
    if (!unlocked) {
      status = r.tier === 5 ? `Won't even look at you. (REP ${TIER_REP[5]} + beat every ★★★★ racer)` : `Won't race nobodies. (REP ${TIER_REP[r.tier]})`;
    } else if (!present) {
      status = 'Not here tonight.';
    } else if (S.racedTonight.includes(r.id)) {
      status = 'Already raced you tonight.';
    } else {
      hotkey += 1;
      action = btn('Challenge', 'challenge', { arg: r.id, key: hotkey < 10 ? String(hotkey) : '', disabled: !car || left <= 0 || car.condition <= 0 });
    }
    const looks = unlocked && present ? btn('Look', 'look', { arg: r.id }) : '';
    return `<tr class="${unlocked && present ? '' : 'dimrow'} ${r.tier === 5 ? 'king' : ''}">
      <td class="stars">${stars(r.tier)}</td>
      <td><b>${unlocked ? esc(r.name) : '???'}</b><br><span class="small">${unlocked ? esc(MODELS[r.car.model].name) : ''}${rec.w + rec.l ? ` · You ${rec.w}-${rec.l}` : ''}</span></td>
      <td class="small">${unlocked ? (r.pinksOnly ? 'Pinks only' : `${money(r.bet[0])}–${money(r.bet[1])}${r.pinks ? ' · pinks' : ''}`) : ''}<br>${unlocked ? r.races.map((x) => (x === 'drag' ? 'Drag' : 'Street')).join(' / ') : ''}</td>
      <td class="small">${status}</td>
      <td>${looks}${action}</td>
    </tr>`;
  }).join('');
  return `${header()}
  <section class="panel night">
    <h2>THE TIP-TOP DRIVE-IN <small>${left > 0 ? `${left} race${left > 1 ? 's' : ''} left tonight` : "It's late. Everybody's heading home."}</small></h2>
    ${!car ? '<p class="bad">You walked here. Nobody races a pedestrian.</p>' : ''}
    ${car && car.condition <= 0 ? '<p class="bad">Your engine is blown. Fix it in the garage first.</p>' : ''}
    <table class="rivals">${rows}</table>
    ${ui.lookAt ? lookPanel() : ''}
    ${ui.challenge ? challengePanel() : ''}
    <div class="menu">${btn(left > 0 ? 'Head home (ends the night)' : 'Head home', 'sleep', { key: 'H' })}${btn('Back to town', 'go', { arg: 'hub', key: 'Escape' })}</div>
  </section>`;
};

const lookPanel = () => {
  const r = rivalById(ui.lookAt);
  const car = { ...r.car, condition: 100 };
  return `<div class="modal"><div class="panel">
    <h2>${esc(r.name)}'s ${esc(MODELS[r.car.model].name)}</h2>
    ${profileCanvas('rival', r.id, 400, 150)}
    ${statTable(car)}
    <div class="menu">${btn('Close', 'closeModal', { key: 'Escape' })}</div>
  </div></div>`;
};

const challengePanel = () => {
  const r = rivalById(ui.challenge.id);
  const car = activeCar(S);
  const bank = rivalBank(S, r);
  const maxBet = Math.min(r.bet[1], bank, S.cash);
  const bets = [];
  if (!r.pinksOnly && maxBet >= r.bet[0]) {
    const steps = 4;
    for (let i = 0; i < steps; i++) {
      const v = Math.round((r.bet[0] + ((maxBet - r.bet[0]) * i) / (steps - 1)) / 5) * 5;
      if (!bets.includes(v)) {
        bets.push(v);
      }
    }
  }
  const pinksOk = r.pinks && carValue(car) >= carValue({ ...r.car, condition: 100 }) * 0.4;
  const type = ui.challenge.type || r.races[0];
  let pinksNote = '';
  if (r.pinks && !pinksOk) {
    pinksNote = `<p class="small bad">"Pinks? For <i>that</i> heap? Come back with a real car."</p>`;
  } else if (!r.pinks) {
    pinksNote = '<p class="small dim">Won\'t race for pink slips.</p>';
  }
  let cashNote = '';
  if (!r.pinksOnly && !bets.length) {
    cashNote = bank < r.bet[0]
      ? '<p class="small bad">"I\'m tapped out, pal."</p>'
      : `<p class="small bad">You need at least ${money(r.bet[0])} to race for cash.</p>`;
  }
  return `<div class="modal"><div class="panel">
    <h2>${esc(r.name)}</h2>
    <p class="quote">"${esc(r.taunt)}"</p>
    <h3>RACE</h3>
    <div class="tabs">${r.races.map((x, i) => btn(x === 'drag' ? 'Drag — 1/4 mile, the old airstrip' : "Street — Devil's Canyon Road", 'raceType', { arg: x, key: String(i + 1), cls: x === type ? 'on' : '' })).join('')}</div>
    <h3>STAKES</h3>
    <div class="tabs">
      ${bets.map((b) => btn(money(b), 'race', { arg: `${type}:${b}`, cls: 'hot' })).join('')}
      ${r.pinks && pinksOk ? btn('PINK SLIPS', 'race', { arg: `${type}:pinks`, cls: 'pinks', key: 'P' }) : ''}
    </div>
    ${cashNote}${pinksNote}
    <div class="menu">${btn('Back out', 'closeModal', { key: 'Escape' })}</div>
  </div></div>`;
};

const resultScreen = () => {
  const res = ui.result;
  return `${header()}
  <section class="panel">
    <h2 class="${res.won ? 'good' : 'bad'}">${res.won ? 'VICTORY' : 'DEFEAT'}</h2>
    <p class="quote">${esc(res.rivalName)}: "${esc(res.quote)}"</p>
    <ul class="log">${res.lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <div class="menu">${btn('Continue', 'afterRace', { key: '1', cls: 'big' })}</div>
  </section>`;
};

const kingScreen = () => `
  <div class="title">
    <h1 class="logo">LONG LIVE<span>THE KING</span></h1>
    ${profileCanvas('profile', S.activeCarId || '', 480, 150)}
    <p>You took Rex Castellano's pink slip on ${dateLabel(S.day)}.<br>From now on, the Tip-Top Drive-In knows one name, and it's yours.</p>
    <p class="small">Record ${S.stats.wins}-${S.stats.losses} · Won ${money(S.stats.earned)} · ${S.stats.pinksWon} pink slips · ${S.stats.tickets} tickets</p>
    <div class="menu center">${btn('Keep cruising', 'go', { arg: 'hub', key: '1', cls: 'big' })}${btn('New game', 'new', { key: '2' })}</div>
  </div>`;

const summerScreen = () => `
  <div class="title">
    <h1 class="logo">LABOR DAY<span>1963</span></h1>
    <p>The summer's over. ${S.king ? 'You ruled the valley.' : "The King still rules the Tip-Top. There's always next summer..."}</p>
    <p class="small">Record ${S.stats.wins}-${S.stats.losses} · Won ${money(S.stats.earned)} · Rep ${S.rep} · Cash ${money(S.cash)}</p>
    <div class="menu center">${btn('Endless summer (keep playing)', 'go', { arg: 'hub', key: '1', cls: 'big' })}${btn('New game', 'new', { key: '2' })}</div>
  </div>`;

const noticeModal = () => `<div class="modal"><div class="panel"><h2>${esc(ui.notice.title)}</h2>${ui.notice.lines.map((l) => `<p>${l}</p>`).join('')}
  <div class="menu">${btn('OK', 'closeNotice', { key: 'Enter' })}</div></div></div>`;

const SCREENS = {
  title: titleScreen, help: helpScreen, hub: hubScreen, garage: garageScreen, shop: shopScreen,
  classifieds: classifiedsScreen, drivein: driveInScreen, result: resultScreen, king: kingScreen, summer: summerScreen,
};

const drawProfiles = () => {
  root.querySelectorAll('canvas.profile').forEach((cv) => {
    const c = cv.getContext('2d');
    let car = null;
    if (cv.dataset.profile) {
      car = S.cars.find((x) => x.id === cv.dataset.profile);
    } else if (cv.dataset.listing) {
      car = S.classifieds[Number(cv.dataset.listing)]?.car;
    } else if (cv.dataset.rival) {
      car = rivalById(cv.dataset.rival).car;
    } else if (cv.dataset.demo) {
      car = { model: 'chevy57', color: '#e0182d', flames: true };
    }
    c.clearRect(0, 0, cv.width, cv.height);
    const floor = c.createLinearGradient(0, cv.height * 0.75, 0, cv.height);
    floor.addColorStop(0, '#2a2240');
    floor.addColorStop(1, '#0b0624');
    c.fillStyle = floor;
    c.fillRect(0, cv.height * 0.8, cv.width, cv.height * 0.2);
    if (car) {
      const scale = Math.min((cv.width * 0.86) / 100, (cv.height * 0.8) / 48);
      drawCarSide(c, MODELS[car.model].body, car.color, car.flames, (cv.width - 100 * scale) / 2, cv.height * 0.86, scale);
    }
  });
};

const render = () => {
  if (race) {
    return;
  }
  if (S && S.king && !S.kingSeen && ui.screen === 'hub') {
    S.kingSeen = true;
    ui.screen = 'king';
  }
  if (S && S.summerOver && !S.summerSeen && ui.screen === 'hub') {
    S.summerSeen = true;
    ui.screen = 'summer';
  }
  root.innerHTML = SCREENS[ui.screen]() + (ui.notice ? noticeModal() : '');
  drawProfiles();
  persist();
};

const notice = (title, lines) => {
  ui.notice = { title, lines };
};

// ---------- race flow ----------

const partWear = (car) => (partOf(car, 'carb').wear || 0) + (partOf(car, 'cam').wear || 0);

const runRace = (rival, type, stake) => {
  const car = activeCar(S);
  ui.challenge = null;
  root.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'race';
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  wrap.appendChild(canvas);
  if (matchMedia('(pointer: coarse)').matches) {
    wrap.appendChild(touchControls(type === 'street' ? 'street' : 'drag'));
  }
  root.appendChild(wrap);
  input.setActive(true);
  const opts = { playerCar: car, rival, sound: !isMuted() };
  const onDone = (result) => {
    race = null;
    input.setActive(false);
    settleRace(rival, type, stake, result);
  };
  race = type === 'street' ? startStreet(canvas, opts, onDone) : startDrag(canvas, opts, onDone);
};

const settleRace = (rival, type, stake, result) => {
  const car = activeCar(S);
  const lines = [];
  const rec = S.record[rival.id] || { w: 0, l: 0 };
  S.record[rival.id] = rec;
  S.banks = S.banks || {};
  S.banks[rival.id] = rivalBank(S, rival);

  let wear = 1 + Math.random() * 1.5 + partWear(car) + Math.min(35, result.damage || 0);
  if (result.overRev > 0.6) {
    wear += result.overRev * 5;
    lines.push('You leaned on it past redline. The engine took a beating.');
  }
  car.condition = Math.max(0, Math.round(car.condition - wear));
  if (result.blown) {
    car.condition = 0;
    lines.push('<b class="bad">You blew the engine.</b> It needs a rebuild before you can race again.');
  }
  if (result.crashes) {
    lines.push(`You wrecked ${result.crashes} time${result.crashes > 1 ? 's' : ''}. The body shop is going to love you.`);
  }

  const first = shortName(rival.name);
  if (result.won) {
    rec.w += 1;
    S.stats.wins += 1;
    const repGain = rival.tier * 3 + (stake === 'pinks' ? 2 : 0);
    S.rep += repGain;
    if (stake === 'pinks') {
      const won = makeCar(rival.car.model, { engine: rival.car.engine, parts: { ...rival.car.parts }, color: rival.car.color, condition: 85 });
      S.stats.pinksWon += 1;
      S.gone.push(rival.id);
      if (garageFull(S)) {
        const price = sellPrice(won);
        S.cash += price;
        lines.push(`<b class="good">You won the pink slip!</b> Your garage is full, so you sold the ${MODELS[won.model].name} for ${money(price)}.`);
      } else {
        addCar(S, won);
        lines.push(`<b class="good">You won the pink slip!</b> The ${MODELS[won.model].name} is in your garage.`);
      }
      if (rival.tier === 5) {
        S.king = true;
        S.log.unshift(`${dateLabel(S.day)}: You beat The King for his pinks. All hail the new King!`);
      } else {
        S.log.unshift(`${first} handed over the keys to the ${MODELS[rival.car.model].name}. They've left town in shame.`);
      }
    } else {
      S.cash += stake;
      S.stats.earned += stake;
      S.banks[rival.id] -= stake;
      lines.push(`<b class="good">+${money(stake)}</b>`);
      S.log.unshift(`You beat ${first} for ${money(stake)}.`);
    }
    lines.push(`+${repGain} rep`);
    if (!isMuted()) {
      cashSound();
    }
  } else {
    rec.l += 1;
    S.stats.losses += 1;
    S.rep = Math.max(0, S.rep - 1);
    if (stake === 'pinks') {
      lines.push(`<b class="bad">You lost your ${MODELS[car.model].name}.</b> ${first} drives off in it.`);
      S.log.unshift(`You lost your ${MODELS[car.model].name} to ${first}. Ouch.`);
      removeCar(S, car.id);
    } else {
      S.cash -= stake;
      S.banks[rival.id] += stake;
      lines.push(`<b class="bad">−${money(stake)}</b>`);
      S.log.unshift(`${first} beat you for ${money(stake)}.`);
    }
    lines.push('−1 rep');
  }

  const copChance = type === 'street' ? 0.12 : 0.04;
  if (Math.random() < copChance) {
    const fine = Math.round(rand(40, 150) / 5) * 5;
    const paid = Math.min(fine, Math.max(0, S.cash));
    S.cash -= paid;
    S.stats.tickets += 1;
    lines.push(`<b class="bad">Cops!</b> Officer Krupke wrote you up for exhibition of speed. Fine: ${money(paid)}.`);
  }

  S.racesTonight += 1;
  S.racedTonight.push(rival.id);
  S.log = S.log.slice(0, 8);
  ui.result = { won: result.won, rivalName: rival.name, quote: result.won ? rival.lose : rival.win, lines };
  ui.screen = 'result';
  render();
};

// ---------- actions ----------

const endDay = (message) => {
  advanceDay(S, message);
  ui.challenge = null;
  ui.lookAt = null;
  ui.screen = 'hub';
};

const actions = {
  new: () => {
    if (S && !S.king && S.day > 0 && !confirm('Start over? Your current summer will be lost.')) {
      return;
    }
    clearSave();
    S = newGame();
    ui.screen = 'hub';
    notice('SUMMER, 1963', [
      "School's out. You've got $750 and something to prove.",
      'Find a car in the <b>classifieds</b>, soup it up at <b>Hal\'s Speed Shop</b>, then head to the <b>Tip-Top Drive-In</b> and start racing.',
      `Beat The King before Labor Day, ${SUMMER_DAYS} days from now.`,
    ]);
  },
  continue: () => {
    ui.screen = 'hub';
  },
  help: () => {
    ui.prev = ui.screen;
    ui.screen = 'help';
  },
  back: () => {
    ui.screen = ui.prev || 'title';
  },
  title: () => {
    ui.screen = 'title';
  },
  mute: () => {
    setMuted(!isMuted());
    if (S) {
      S.muted = isMuted();
    }
  },
  go: (arg) => {
    ui.screen = arg;
    ui.challenge = null;
    ui.lookAt = null;
  },
  work: () => {
    const pay = Math.round(rand(15, 30));
    S.cash += pay;
    endDay(`You pumped gas at Sal's all day and made ${money(pay)}.${Math.random() < 0.3 ? ' A cute customer left a phone number.' : ''}`);
  },
  sleep: () => {
    endDay(pick(['Another warm night in the valley.', 'You dreamed about dual quads.', 'Mom says you smell like gasoline.', 'The radio played "Surfin\' U.S.A." four times.']));
  },
  garagePick: (id) => {
    ui.garageCar = id;
  },
  setActive: (id) => {
    S.activeCarId = id;
  },
  repair: (id) => {
    const car = S.cars.find((c) => c.id === id);
    const cost = repairCost(car);
    if (S.cash >= cost) {
      S.cash -= cost;
      car.condition = 100;
    }
  },
  sell: (id) => {
    const car = S.cars.find((c) => c.id === id);
    if (!confirm(`Sell the ${MODELS[car.model].name} for ${money(sellPrice(car))}?`)) {
      return;
    }
    S.cash += sellPrice(car);
    removeCar(S, id);
    ui.garageCar = null;
  },
  paint: (hex) => {
    const car = S.cars.find((c) => c.id === ui.garageCar);
    if (car && S.cash >= PAINT_PRICE && car.color !== hex) {
      S.cash -= PAINT_PRICE;
      car.color = hex;
    }
  },
  flames: (id) => {
    const car = S.cars.find((c) => c.id === id);
    if (car.flames) {
      car.flames = false;
    } else if (S.cash >= FLAMES_PRICE) {
      S.cash -= FLAMES_PRICE;
      car.flames = true;
    }
  },
  shopTab: (tab) => {
    ui.shopTab = tab;
  },
  buy: (arg) => {
    const [group, id] = arg.split(':');
    const car = activeCar(S);
    if (group === 'engine') {
      const price = Math.max(0, ENGINES[id].price - Math.round(ENGINES[car.engine].price * 0.25));
      if (S.cash >= price) {
        S.cash -= price;
        car.engine = id;
        car.condition = 100;
      }
      return;
    }
    const option = PARTS[group].options.find((o) => o.id === id);
    const price = Math.max(0, option.price - tradeIn(car, group));
    if (S.cash >= price) {
      S.cash -= price;
      car.parts[group] = id;
    }
  },
  buyCar: (i) => {
    const listing = S.classifieds[Number(i)];
    if (!listing || S.cash < listing.price || garageFull(S)) {
      return;
    }
    S.cash -= listing.price;
    addCar(S, listing.car);
    S.classifieds.splice(Number(i), 1);
    S.log.unshift(`You bought a ${MODELS[listing.car.model].name} for ${money(listing.price)}.`);
    notice('SOLD!', [`The ${esc(MODELS[listing.car.model].name)} is yours. ${S.cars.length === 1 ? "It's your race car." : 'Make it your race car from the garage.'}`]);
  },
  look: (id) => {
    ui.lookAt = id;
    ui.challenge = null;
  },
  challenge: (id) => {
    ui.challenge = { id, type: rivalById(id).races[0] };
    ui.lookAt = null;
  },
  raceType: (type) => {
    ui.challenge.type = type;
  },
  closeModal: () => {
    ui.challenge = null;
    ui.lookAt = null;
  },
  closeNotice: () => {
    ui.notice = null;
  },
  race: (arg) => {
    const [type, stakeRaw] = arg.split(':');
    const rival = rivalById(ui.challenge.id);
    const stake = stakeRaw === 'pinks' ? 'pinks' : Number(stakeRaw);
    unlock();
    runRace(rival, type, stake);
  },
  afterRace: () => {
    ui.result = null;
    if (!S.cars.length && S.cash < 200) {
      S.cash += 100;
      S.log.unshift('Your uncle felt sorry for you and slipped you $100.');
    }
    if (racesLeft(S) <= 0) {
      endDay('You cruised home after midnight.');
    } else {
      ui.screen = S.king && !S.kingSeen ? 'hub' : 'drivein';
    }
  },
};

root.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || race) {
    return;
  }
  unlock();
  const action = actions[el.dataset.act];
  if (action) {
    action(el.dataset.arg);
    render();
  }
});

window.addEventListener('keydown', (e) => {
  if (race) {
    return;
  }
  if (e.key === 'm' || e.key === 'M') {
    actions.mute();
    render();
    return;
  }
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const scope = root.querySelector('.modal') || root;
  const target = [...scope.querySelectorAll('[data-key]')].find((b) => b.dataset.key.toUpperCase() === key.toUpperCase() && !b.disabled);
  if (target) {
    e.preventDefault();
    target.click();
  }
});

if (S?.muted) {
  setMuted(true);
}
const fontsReady = document.fonts?.load ? document.fonts.load('16px "Press Start 2P"') : Promise.resolve();
fontsReady.catch(() => {}).finally(render);
render();
