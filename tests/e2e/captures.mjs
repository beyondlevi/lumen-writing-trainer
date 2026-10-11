// Captures every screen and state at 600x600, in Portuguese (the language of
// the approved design), and puts each next to its board from docs/design.
//
//   npm run build && npm run captures            (writes .captures/)
//   CAPTURES=out npm run captures
//
// The draws are seeded (Math.random), so the same build captures the same
// words; the history is a made-up wearer close to the boards' example.
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {FAKE_WRITING} from './fakeLumen.mjs';
import {startStaticServer} from './static-server.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const out = path.resolve(process.env.CAPTURES ?? path.join(root, '.captures'));
const designDir = path.join(root, 'docs/design');
const APP = 'http://127.0.0.1:4173';
fs.mkdirSync(path.join(out, 'app'), {recursive: true});
fs.mkdirSync(path.join(out, 'side-by-side'), {recursive: true});

const dayKey = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Five days in a row, level 3 at 68% of its experience, the first three word levels done. */
function wearer() {
  const days = {};
  const week = [5.1, 5.8, 6.4, 6.1, 7.2, 7.8, 9.4];
  week.forEach((wpm, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    if (index !== 1) days[dayKey(date)] = {characters: Math.round(wpm * 5 * 3), ms: 180000, rounds: 2};
  });
  const accuracy = {a: 98, b: 90, c: 96, d: 82, e: 97, f: 88, g: 79, h: 93, i: 85, j: 91, k: 87, l: 64, m: 89, n: 83, o: 81, p: 94, q: 77, r: 86, s: 75, t: 92, u: 90, v: 71, w: 84, x: 88, y: 86, z: 90};
  const letters = Object.fromEntries(Object.entries(accuracy).map(([letter, hits]) => [letter, {attempts: 100, hits}]));
  return {
    version: 1,
    xp: 504,
    best: {
      words: [{stars: 3, wpm: 7, accuracy: 1}, {stars: 3, wpm: 6, accuracy: 0.99}, {stars: 2, wpm: 5.2, accuracy: 0.93}, null, null, null, null, null],
      phrases: [{stars: 2, wpm: 9.4, accuracy: 0.95}, null, null, null],
    },
    bestWpm: {words: 7, phrases: 9.4},
    letters,
    days,
    dailyDone: null,
  };
}

const seededRandom = seed => `(() => {
  let state = ${seed} >>> 0;
  Math.random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

const bandText = text => text.normalize('NFD').replace(/\p{M}/gu, '');

async function open(browser, {seed = 7, writing = false, storage = wearer()} = {}) {
  const context = await browser.newContext({viewport: {width: 600, height: 600}, locale: 'pt-BR'});
  await context.addInitScript(seededRandom(seed));
  if (writing) await context.addInitScript(FAKE_WRITING);
  await context.addInitScript(([key, value]) => {
    if (sessionStorage.getItem('seeded') == null) {
      localStorage.setItem(key, value);
      sessionStorage.setItem('seeded', '1');
    }
  }, ['lumen-writing-trainer', JSON.stringify(storage)]);
  const page = await context.newPage();
  page.on('pageerror', error => console.error(`pageerror: ${error.message}`));
  return {context, page};
}

const settle = page => page.waitForTimeout(900);
const typeText = (page, text) => page.keyboard.type(text, {delay: 60});

async function capture(page, name) {
  await page.screenshot({path: path.join(out, 'app', `${name}.png`)});
  console.log(`captured ${name}`);
}

async function main() {
  const server = await startStaticServer(path.join(root, 'dist'), 4173);
  const browser = await chromium.launch();
  try {
    // 01 Home, 02 Trail (current level focused, then a locked one)
    {
      const {context, page} = await open(browser);
      await page.goto(APP);
      await settle(page);
      await capture(page, '01-home');
      await page.keyboard.press('Enter');
      await settle(page);
      await capture(page, '02-trail');
      await page.keyboard.press('ArrowDown');
      await settle(page);
      await capture(page, '02b-trail-locked');
      await context.close();
    }
    // 03–06 and 08: a word round of "Letras parecidas", with Lumen's writing API
    {
      const {context, page} = await open(browser, {writing: true});
      await page.goto(`${APP}/trail/words`);
      await settle(page);
      await page.keyboard.press('Enter');
      await settle(page);
      await capture(page, '03-word-before-writing');
      await page.evaluate(() => window.__writing.emit('preparing'));
      await page.waitForTimeout(300);
      await capture(page, '03b-preparing');
      await page.evaluate(() => window.__writing.emit('writing'));
      const word = await page.locator('[data-target-word]').last().getAttribute('data-target-word');
      const text = bandText(word);
      await typeText(page, text.slice(0, 2));
      await page.waitForTimeout(400);
      await capture(page, '04-writing');
      const wrong = text[2] === 'l' ? 'i' : 'l';
      await typeText(page, wrong);
      await page.waitForTimeout(400);
      await capture(page, '05-wrong-letter');
      await page.keyboard.press('Backspace');
      await typeText(page, `${text.slice(2)} `);
      // The second word, without an error: its check marks and points.
      const second = bandText(await page.locator('[data-target-word]').last().getAttribute('data-target-word'));
      await typeText(page, second);
      await page.waitForTimeout(450);
      await capture(page, '06-word-complete');
      await typeText(page, ' ');
      for (let index = 2; index < 10; index += 1) {
        if (index === 4) {
          await page.evaluate(() => window.__writing.emit('off'));
          await page.waitForTimeout(400);
          await capture(page, '10-pause');
          await page.keyboard.press('Enter');
          await page.evaluate(() => window.__writing.emit('writing'));
        }
        const next = await page.locator('[data-target-word]').last().getAttribute('data-target-word');
        await typeText(page, bandText(next) + (index < 9 ? ' ' : ''));
        await page.waitForTimeout(150);
      }
      await page.waitForURL('**/result');
      await page.waitForTimeout(4500); // the "new level" notice leaves the header
      await capture(page, '08-round-result');
      await context.close();
    }
    // 07 Phrase: a phrase with an accent, a swapped letter, speed live
    {
      let done = false;
      for (let seed = 1; seed < 40 && !done; seed += 1) {
        const {context, page} = await open(browser, {seed});
        await page.goto(`${APP}/play/phrases/0`);
        await settle(page);
        const first = await page.locator('[data-target-phrase]').last().getAttribute('data-target-phrase');
        await typeText(page, `${bandText(first)} `);
        await page.waitForTimeout(300);
        const phrase = await page.locator('[data-target-phrase]').last().getAttribute('data-target-phrase');
        if (bandText(phrase) !== phrase && phrase.split(' ').length >= 3) {
          const text = bandText(phrase);
          const words = text.split(' ');
          // A swapped letter in the accented word, put right, then half the phrase.
          const accentedAt = phrase.split(' ').findIndex(word => bandText(word) !== word);
          const before = words.slice(0, accentedAt).join(' ') + (accentedAt > 0 ? ' ' : '');
          await typeText(page, before + words[accentedAt].slice(0, 1) + 'x');
          await page.keyboard.press('Backspace');
          const upTo = Math.min(text.length - 3, before.length + words[accentedAt].length + 3);
          await typeText(page, text.slice(before.length + 1, upTo));
          await page.waitForTimeout(1200);
          await capture(page, '07-phrase-speed');
          done = true;
        }
        await context.close();
      }
      if (!done) throw new Error('no accented phrase found');
    }
    // 09 Progress
    {
      const {context, page} = await open(browser);
      await page.goto(`${APP}/progress`);
      await settle(page);
      await capture(page, '09-progress');
      await context.close();
    }
    // English, the default language: Home
    {
      const context = await browser.newContext({viewport: {width: 600, height: 600}, locale: 'en-US'});
      await context.addInitScript(value => localStorage.setItem('lumen-writing-trainer', value), JSON.stringify(wearer()));
      const page = await context.newPage();
      await page.goto(APP);
      await settle(page);
      await capture(page, '11-home-english');
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  // Side by side: the approved board, then the app.
  const pairs = [
    ['01-home', '01-home'],
    ['02-level-trail', '02-trail'],
    ['03-word-before-writing', '03-word-before-writing'],
    ['04-glasses-while-writing', '04-writing'],
    ['05-wrong-letter', '05-wrong-letter'],
    ['06-word-complete', '06-word-complete'],
    ['07-phrase-speed', '07-phrase-speed'],
    ['08-round-result', '08-round-result'],
    ['09-progress', '09-progress'],
  ];
  for (const [board, shot] of pairs) {
    const left = sharp(path.join(designDir, `${board}.png`));
    const {width: lw, height: lh} = await left.metadata();
    const right = path.join(out, 'app', `${shot}.png`);
    const gap = 24;
    const height = Math.max(lh, 600);
    await sharp({create: {width: lw + gap + 600, height, channels: 3, background: '#3a3a3a'}})
      .composite([
        {input: await left.png().toBuffer(), left: 0, top: Math.round((height - lh) / 2)},
        {input: right, left: lw + gap, top: Math.round((height - 600) / 2)},
      ])
      .png()
      .toFile(path.join(out, 'side-by-side', `${board}.png`));
  }
  console.log(`side by side: ${pairs.length} pairs in ${path.join(out, 'side-by-side')}`);
}

await main();
