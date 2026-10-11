// Times navigation on a slow CPU, the way the glasses feel it: Chromium with
// its CPU throttled (6x by default) and a 600x600 viewport, with a wearer's
// full history (every level played, every letter tried, 120 days of rounds).
//
//   npm run build && npm run perf
//   PERF_CPU=4 PERF_RUNS=5 npm run perf
//   PERF_OUT=out.json (writes every sample)
//
// For each key it records, from the key's event time to the end of a frame
// (its style, layout and paint included): `ready`, the first frame with the
// target screen in the page; `first`, the first frame where it is drawn at
// all; `full`, the first frame where it is fully drawn on top, with the other
// screen gone (page transitions included); and `busy`, the main thread's long
// tasks in the 2.5 s after the key. Launch: from the start of navigation to the
// first frame with Home fully drawn (`launchMs`).
//
// Moves measured: Home -> Words trail -> a round -> Back to the trail -> Back
// to Home, and Home -> Progress -> Back to Home.
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import {startStaticServer} from '../e2e/static-server.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const APP = 'http://127.0.0.1:4173';
const CPU = Number(process.env.PERF_CPU ?? 6);
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const LAUNCHES = Number(process.env.PERF_LAUNCHES ?? 3);

const HOME_ROW = '[data-row="words"]';
const PROGRESS_ROW = '[data-row="progress"]';
const TRAIL_LEVEL = '[data-level]';
const ROUND = '.round-content';
const PROGRESS = '.progress';

/** A wearer with every level played and a long history. */
function history() {
  const days = {};
  const today = new Date();
  for (let offset = 0; offset < 120; offset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset, 12);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    days[key] = {characters: 300 + offset, ms: 180000, rounds: 3};
  }
  const letters = Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((letter, index) => [letter, {attempts: 400, hits: 300 + index * 3}]));
  const best = count => Array.from({length: count}, (_, index) => ({stars: index % 3 === 0 ? 3 : 2, wpm: 5 + index, accuracy: 0.93}));
  return {version: 1, xp: 5400, best: {words: best(8), phrases: best(4)}, bestWpm: {words: 7.2, phrases: 9.4}, letters, days, dailyDone: null};
}

// Long tasks from the start of the page; and a frame watcher the script arms before each key.
const PAGE_SCRIPT = `(() => {
  const ROW = ${JSON.stringify(HOME_ROW)};
  window.__longTasks = [];
  try {
    new PerformanceObserver(list => window.__longTasks.push(...list.getEntries().map(e => [e.startTime, e.duration])))
      .observe({type: 'longtask', buffered: true});
  } catch {}
  const opacity = element => {
    let value = 1;
    for (let node = element; node instanceof Element; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return 0;
      value *= Number(style.opacity);
    }
    return value;
  };
  // Whether \`a\` is drawn above \`b\`: by z-index, then document order, where their ancestors part.
  // (Hit testing can't tell: it skips inert pages, such as one that has just come back.)
  const zIndex = element => {
    const style = getComputedStyle(element);
    return style.position !== 'static' && style.zIndex !== 'auto' ? Number(style.zIndex) : 0;
  };
  const above = (a, b) => {
    if (a.contains(b) || b.contains(a)) return true;
    const chain = element => { const list = []; for (let node = element; node; node = node.parentElement) list.unshift(node); return list; };
    const ca = chain(a), cb = chain(b);
    let i = 0;
    while (ca[i] === cb[i]) i += 1;
    const za = zIndex(ca[i]), zb = zIndex(cb[i]);
    return za !== zb ? za > zb : Boolean(cb[i].compareDocumentPosition(ca[i]) & Node.DOCUMENT_POSITION_FOLLOWING);
  };
  const onScreen = element => {
    const box = element.getBoundingClientRect();
    return box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
  };
  // How much of the element shows: its opacity, if it is on screen and no visible \`others\` element is drawn above it.
  const shows = (element, others) =>
    onScreen(element) && others.every(other => !onScreen(other) || opacity(other) < 0.01 || above(element, other)) ? opacity(element) : 0;
  const drawn = (selector, otherSelector) => {
    const others = otherSelector ? [...document.querySelectorAll(otherSelector)] : [];
    return Math.max(0, ...[...document.querySelectorAll(selector)].map(element => shows(element, others)));
  };
  window.__drawn = drawn;
  // Calls back once the current frame is rendered: a message posted from an animation frame is handled after it.
  const afterFrame = callback => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => callback(performance.now());
    channel.port2.postMessage(0);
  };
  // Launch: the first frame, from navigation start, with Home's first row fully drawn.
  const launch = () => {
    if (drawn(ROW) > 0.99) afterFrame(time => { window.__launch = time; });
    else requestAnimationFrame(launch);
  };
  requestAnimationFrame(launch);
  // Resolves the frames where 'show' is first drawn and where it is fully drawn with 'hide' gone.
  window.__watch = (key, show, hide) => {
    const mark = {key: null, ready: null, first: null, full: null};
    window.__mark = mark;
    addEventListener('keydown', event => { if (event.key === key && mark.key == null) mark.key = event.timeStamp; }, {capture: true});
    // The frame's own timestamp can be older than the work done before it, so
    // the time is read once the frame is rendered; -1 marks a frame on its way.
    const at = name => afterFrame(time => { mark[name] = time - mark.key; });
    const tick = () => {
      if (mark.key != null) {
        const shown = drawn(show, hide);
        const hidden = hide ? drawn(hide, show) : 0;
        if (mark.ready == null && document.querySelector(show) != null) { mark.ready = -1; at('ready'); }
        if (mark.first == null && shown > 0.01) { mark.first = -1; at('first'); }
        if (mark.full == null && shown > 0.99 && hidden < 0.01) { mark.full = -1; at('full'); }
      }
      if (mark.full == null) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
})();`;

const median = values => {
  const sorted = values.filter(value => value != null).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null;
};

async function activeLabel(page) {
  return page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '(none)');
}

async function busySince(page, since, windowMs = 2500) {
  await page.waitForTimeout(windowMs);
  return page.evaluate(([from, to]) => Math.round(window.__longTasks
    .filter(([start]) => start >= from && start < to)
    .reduce((sum, [, duration]) => sum + duration, 0)), [since, since + windowMs]);
}

async function timeKey(page, key, show, hide) {
  await page.evaluate(([k, s, h]) => window.__watch(k, s, h), [key, show, hide]);
  await page.keyboard.press(key);
  await page.waitForFunction(() => window.__mark.full > 0, null, {timeout: 20000});
  const mark = await page.evaluate(() => window.__mark);
  const busy = await busySince(page, mark.key);
  mark.focus = await activeLabel(page);
  return {ready: Math.round(mark.ready), first: Math.round(mark.first), full: Math.round(mark.full), busy, focus: mark.focus};
}

async function main() {
  const dist = path.join(root, 'dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Build first: npm run build');
  const server = await startStaticServer(dist, 4173);
  const browser = await chromium.launch();
  const moves = ['openTrail', 'openRound', 'backToTrail', 'backToHome', 'openProgress', 'backFromProgress'];
  const results = {cpu: CPU, launches: [], launchBusy: [], ...Object.fromEntries(moves.map(move => [move, []]))};
  try {
    for (let launch = 0; launch < LAUNCHES; launch += 1) {
      const context = await browser.newContext({viewport: {width: 600, height: 600}, locale: 'en-US'});
      await context.addInitScript(value => localStorage.setItem('lumen-writing-trainer', value), JSON.stringify(history()));
      await context.addInitScript(PAGE_SCRIPT);
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', {rate: CPU});
      await page.goto(APP);
      await page.waitForFunction(() => window.__launch != null, null, {timeout: 60000});
      results.launches.push(Math.round(await page.evaluate(() => window.__launch)));
      await page.waitForTimeout(6000);
      results.launchBusy.push(await page.evaluate(() => {
        const tasks = window.__longTasks.filter(([start]) => start < 6000);
        return [Math.round(tasks.reduce((sum, [, duration]) => sum + duration, 0)),
          Math.round(Math.max(0, ...tasks.map(([start, duration]) => start + duration)))];
      }));

      if (launch === LAUNCHES - 1) {
        for (let run = 0; run < RUNS; run += 1) {
          // Home -> Words trail -> the 4th level's round -> Back -> Back.
          const trail = await timeKey(page, 'Enter', TRAIL_LEVEL, HOME_ROW);
          results.openTrail.push(trail);
          await page.waitForTimeout(1500);
          for (let i = 0; i < 8 && !/^Look-alike/.test(await activeLabel(page)); i += 1) {
            await page.keyboard.press('ArrowUp');
            await page.waitForTimeout(500);
          }
          if (!/^Look-alike/.test(await activeLabel(page))) throw new Error(`level not focused: ${await activeLabel(page)}`);
          results.openRound.push(await timeKey(page, 'Enter', ROUND, TRAIL_LEVEL));
          await page.waitForTimeout(2500);
          const back = await timeKey(page, 'Escape', TRAIL_LEVEL, ROUND);
          back.focusOk = /^Look-alike/.test(back.focus);
          results.backToTrail.push(back);
          await page.waitForTimeout(1500);
          const home = await timeKey(page, 'Escape', HOME_ROW, TRAIL_LEVEL);
          home.focusOk = /^Words,/.test(home.focus);
          results.backToHome.push(home);
          await page.waitForTimeout(1500);
          // Home -> Progress -> Back.
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(500);
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(500);
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(800);
          if (!/^Progress,/.test(await activeLabel(page))) throw new Error(`Progress not focused: ${await activeLabel(page)}`);
          results.openProgress.push(await timeKey(page, 'Enter', PROGRESS, PROGRESS_ROW));
          await page.waitForTimeout(2500);
          const fromProgress = await timeKey(page, 'Escape', PROGRESS_ROW, PROGRESS);
          fromProgress.focusOk = /^Progress,/.test(fromProgress.focus);
          results.backFromProgress.push(fromProgress);
          await page.waitForTimeout(1500);
          for (let i = 0; i < 3; i += 1) {
            await page.keyboard.press('ArrowUp');
            await page.waitForTimeout(500);
          }
          if (!/^Words,/.test(await activeLabel(page))) throw new Error(`Words not focused: ${await activeLabel(page)}`);
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  const summary = {
    cpu: `${CPU}x`,
    runs: RUNS,
    launchMs: median(results.launches),
    launchBusyMs: median(results.launchBusy.map(([busy]) => busy)),
    launchIdleMs: median(results.launchBusy.map(([, idle]) => idle)),
  };
  for (const move of moves) {
    summary[`${move}FullMs`] = median(results[move].map(sample => sample.full));
    summary[`${move}FirstMs`] = median(results[move].map(sample => sample.first));
    summary[`${move}BusyMs`] = median(results[move].map(sample => sample.busy));
    if (results[move].some(sample => 'focusOk' in sample)) {
      summary[`${move}FocusOk`] = results[move].every(sample => sample.focusOk);
    }
  }
  if (process.env.PERF_OUT) fs.writeFileSync(process.env.PERF_OUT, JSON.stringify({summary, ...results}, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  const backs = ['backToTrail', 'backToHome', 'backFromProgress'];
  const slow = backs.filter(move => summary[`${move}FullMs`] > 100);
  const lostFocus = backs.filter(move => summary[`${move}FocusOk`] === false);
  if (slow.length > 0 || lostFocus.length > 0) {
    console.error(`perf: Back over 100 ms (${slow.join(', ') || 'none'}), focus lost (${lostFocus.join(', ') || 'none'})`);
    process.exit(1);
  }
}

await main();
