// Keyboard-only end-to-end tests of the built app, in Chromium and Firefox.
//
//   npm run build && npm run test:e2e
//   E2E_BROWSERS=firefox npm run test:e2e
//   E2E_ONLY='phrase' npm run test:e2e        (only the matching tests)
//
// The app is served like the Lumen host serves a package (static files, SPA
// fallback) on 127.0.0.1:4173. The keyboard stands in for the band: typing in
// the focused field is the band writing letter by letter, arrows are swipes,
// Enter the index tap and Escape the middle tap. `window.lumen.writing` is
// scripted (fakeLumen.mjs) where a test needs Lumen's writing API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {chromium, firefox} from 'playwright';
import {FAKE_WRITING, fakeConfig} from './fakeLumen.mjs';
import {startStaticServer} from './static-server.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const outDir = path.join(root, '.e2e-output');
const APP = 'http://127.0.0.1:4173';
const PACKAGE_APP = 'http://127.0.0.1:5500';
const STORAGE_KEY = 'lumen-writing-trainer';
const browsers = (process.env.E2E_BROWSERS ?? 'chromium,firefox').split(',');
const results = [];

fs.mkdirSync(outDir, {recursive: true});

/** Phrases of a content file (src/content/words*.ts), to tell the content language. */
function phrasesOf(file) {
  const text = fs.readFileSync(path.join(root, 'src/content', file), 'utf8');
  const phrases = text.slice(text.indexOf('phrases:'));
  return new Set([...phrases.matchAll(/'([^']+)'/g)].map(match => match[1]));
}
const EN_PHRASES = phrasesOf('wordsEn.ts');
const PT_PHRASES = phrasesOf('wordsPt.ts');

const oneDecimal = new Intl.NumberFormat('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1});
/** A speed as the English interface shows it. */
const wpmText = value => `${oneDecimal.format(value)} wpm`;

/** What the band writes for a text: no accents. */
const bandText = text => text.normalize('NFD').replace(/\p{M}/gu, '');

async function activeLabel(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    if (!element || element === document.body) return '(body)';
    return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName;
  });
}

async function press(page, key, times = 1) {
  for (let i = 0; i < times; i += 1) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
}

/** Waits until a page shows `text` (kept pages under the routes don't count). */
async function waitForText(page, text, timeout = 10000) {
  const matches = page.getByText(text, {exact: false}).filter({visible: true});
  const started = Date.now();
  for (;;) {
    for (let i = await matches.count(); i > 0; i -= 1) {
      if (await matches.nth(i - 1).evaluate(element => element.closest('.kept-page--hidden') == null).catch(() => false)) return;
    }
    if (Date.now() - started > timeout) throw new Error(`text never shown: ${text}`);
    await page.waitForTimeout(100);
  }
}

async function shows(page, text) {
  return page.evaluate(
    value => [...document.querySelectorAll('body *')].some(
      element => element.children.length === 0 && element.textContent?.includes(value) && element.closest('.kept-page--hidden') == null && element.getClientRects().length > 0,
    ),
    text,
  );
}

async function waitForPath(page, pathname, timeout = 10000) {
  await page.waitForFunction(value => location.pathname === value, pathname, {timeout});
  await page.waitForTimeout(600);
}

async function waitForFocus(page, pattern, timeout = 5000) {
  const started = Date.now();
  for (;;) {
    const label = await activeLabel(page);
    if (pattern.test(label)) return label;
    if (Date.now() - started > timeout) throw new Error(`focus never matched ${pattern}; last: ${label}`);
    await page.waitForTimeout(100);
  }
}

/** The word the round asks for now. */
async function targetWord(page) {
  return page.locator('[data-target-word]').last().getAttribute('data-target-word');
}

async function targetPhrase(page) {
  return page.locator('[data-target-phrase]').last().getAttribute('data-target-phrase');
}

async function write(page, text) {
  await page.keyboard.type(text, {delay: 40});
  await page.waitForTimeout(150);
}

async function calls(page) {
  return page.evaluate(() => window.__writing.calls);
}

async function stored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), STORAGE_KEY);
}

/** True when the app left Escape unhandled (so the host closes the app). */
async function escapeReachesHost(page) {
  await page.evaluate(() => {
    window.__escapePrevented = null;
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') window.__escapePrevented = event.defaultPrevented;
    }, {once: true});
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return page.evaluate(() => window.__escapePrevented === false);
}

async function test(name, fn) {
  if (process.env.E2E_ONLY && !new RegExp(process.env.E2E_ONLY).test(name)) return;
  const started = Date.now();
  try {
    await fn();
    results.push({name, ok: true, ms: Date.now() - started});
    console.log(`ok   ${name} (${Date.now() - started} ms)`);
  } catch (error) {
    results.push({name, ok: false, error: error.message});
    console.log(`FAIL ${name}\n     ${error.stack?.split('\n').slice(0, 8).join('\n     ')}`);
  }
}

async function newPage(browser, {locale = 'en-US', scripts = [], storage = null} = {}) {
  const context = await browser.newContext({viewport: {width: 600, height: 600}, locale});
  for (const script of scripts) await context.addInitScript(script);
  if (storage != null) {
    // Seeded once per context: later loads keep what the app saved.
    await context.addInitScript(([key, value]) => {
      if (sessionStorage.getItem('seeded') == null) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('seeded', '1');
      }
    }, [STORAGE_KEY, JSON.stringify(storage)]);
  }
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error' && !/fonts\.g|Failed to load resource|NetworkError|ERR_/i.test(message.text())) {
      problems.push(`console: ${message.text()}`);
    }
  });
  return {context, page, problems};
}

const shot = (page, label, name) => page.screenshot({path: path.join(outDir, `${label}-${name}.png`)});

/** A word round on the first level, with Lumen's writing API: train, the band's states, pause, a wrong letter, the result and the next level. */
async function wordRound(browser, label) {
  const {context, page, problems} = await newPage(browser, {scripts: [FAKE_WRITING]});
  try {
    await page.goto(APP);
    await waitForText(page, 'Writing Trainer');
    await waitForFocus(page, /^Words, Letter by letter · level 1 of 8/);
    await press(page, 'Enter');
    await waitForPath(page, '/trail/words');
    assert.match(await activeLabel(page), /^Alphabet, not played yet$/);
    await press(page, 'ArrowDown');
    assert.match(await activeLabel(page), /^2 and 3 letters, locked/, 'the next level is locked');
    await waitForText(page, 'Finish the level before');
    await press(page, 'Enter');
    assert.equal(new URL(page.url()).pathname, '/trail/words', 'a locked level does not open');
    await press(page, 'ArrowUp');
    await press(page, 'Enter');
    await waitForPath(page, '/play/words/0');
    await waitForFocus(page, /^Writing field: /);

    // Before writing: the field is empty and Lumen knows the round's text.
    const firstCalls = await calls(page);
    const trained = firstCalls.find(call => call[0] === 'train');
    assert.ok(trained, 'train called before the round');
    const words = trained[1].text.split(' ');
    assert.equal(words.length, 10);
    assert.ok(words.every(word => /^[a-z]$/.test(word)), `alphabet round: ${trained[1].text}`);
    assert.equal(trained[1].lang, 'en');
    assert.ok(firstCalls.some(call => call[0] === 'onState'));
    assert.equal(await page.locator('input.round-field').inputValue(), '');
    assert.equal(await targetWord(page), words[0]);
    await waitForText(page, 'Index: write');
    await shot(page, label, '03-before');

    await page.evaluate(() => window.__writing.emit('preparing'));
    await waitForText(page, 'Preparing the band…');
    await page.evaluate(() => window.__writing.emit('writing'));
    await waitForText(page, 'Middle: stop');

    const wrongWord = 2;
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      assert.equal(await targetWord(page), word, `word ${index + 1}`);
      assert.ok(await shows(page, `${index + 1} of 10`), `header shows ${index + 1} of 10`);
      if (index === 5) {
        // The middle tap stops the band's writing: the round pauses.
        await page.evaluate(() => window.__writing.emit('off'));
        await waitForText(page, 'Paused');
        await waitForText(page, 'Index: continue');
        await waitForText(page, 'Middle: leave the round');
        await shot(page, label, 'pause');
        const before = (await calls(page)).length;
        await press(page, 'Enter');
        const resumed = (await calls(page)).slice(before);
        assert.deepEqual(resumed, [['train', {text: words.slice(5).join(' '), lang: 'en'}]], 'Enter asks Lumen to write again');
        await page.evaluate(() => window.__writing.emit('writing'));
        await page.waitForTimeout(200);
        assert.equal(await shows(page, 'Paused'), false);
      }
      if (index === wrongWord) {
        const wrong = word === 'x' ? 'z' : 'x';
        await write(page, wrong);
        assert.equal(await page.locator(`[aria-label="${word}, the band read ${wrong}"]`).count(), 1, 'wrong tile');
        await waitForText(page, `The band read “${wrong}”. Swipe back and write “${word}” again.`);
        await waitForText(page, `was “${word}”`);
        await waitForText(page, 'Swipe back: erase');
        await shot(page, label, '05-wrong');
        await press(page, 'Backspace');
        assert.equal(await page.locator(`[aria-label="${word}, now"]`).count(), 1, 'the erased letter is the next one again');
      }
      await write(page, word);
      if (index === 0) {
        assert.equal(await page.locator(`[aria-label="${word}, right"]`).count(), 1, 'right tile');
        await waitForText(page, '+15');
        await waitForText(page, 'No errors · combo x2 · next:');
        await shot(page, label, '06-complete');
      }
      if (index < words.length - 1) {
        await write(page, ' ');
      }
    }

    // The last right letter ends the round.
    await waitForPath(page, '/result');
    await waitForText(page, 'Round complete');
    const after = await calls(page);
    assert.deepEqual(after.slice(-2), [['stop'], ['train', null]], 'stop and train(null) at the end');
    assert.equal(await page.locator('[aria-label="2 of 3 stars"]').count(), 1, 'two stars at 90%');
    await waitForText(page, '90%');
    const save = await stored(page);
    assert.equal(save.version, 1);
    assert.equal(save.best.words[0].stars, 2);
    assert.equal(save.best.words[0].accuracy, 0.9);
    assert.ok(save.bestWpm.words > 0);
    const shownWpm = wpmText(save.bestWpm.words);
    await waitForText(page, shownWpm);
    const missed = words[wrongWord];
    assert.ok(save.letters[missed].hits < save.letters[missed].attempts, 'the wrong letter counts as missed');
    assert.equal(await page.locator('.result-train').getByText(missed, {exact: true}).count(), 1, 'Train: shows the missed letter');
    assert.ok(save.xp > 0);
    await waitForFocus(page, /^Next round$/);
    await shot(page, label, '08-result');

    // Next round: the level it opened.
    await press(page, 'Enter');
    await waitForPath(page, '/play/words/1');
    await waitForText(page, 'Index: write');
    await press(page, 'Escape');
    await waitForPath(page, '/trail/words');
    await waitForFocus(page, /^2 and 3 letters, not played yet$/);
    await press(page, 'ArrowUp');
    assert.match(await activeLabel(page), /^Alphabet, 2 of 3 stars$/);
    await press(page, 'Escape');
    await waitForPath(page, '/');
    await waitForFocus(page, /^Words, Letter by letter · level 2 of 8/);
    assert.deepEqual(problems, []);
  } finally {
    await context.close();
  }
}

/** A phrase round without Lumen's writing API: live speed and accuracy, a swapped letter, the result, the next level, then Progress and a reload. */
async function phraseRound(browser, label) {
  const {context, page, problems} = await newPage(browser);
  try {
    await page.goto(APP);
    await waitForFocus(page, /^Words, /);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    await waitForPath(page, '/trail/phrases');
    assert.match(await activeLabel(page), /^Short, not played yet$/);
    await press(page, 'Enter');
    await waitForPath(page, '/play/phrases/0');
    await waitForFocus(page, /^Writing field: /);
    await waitForText(page, 'Write the phrase, one letter at a time.');

    let letters = 0;
    for (let index = 0; index < 5; index += 1) {
      const phrase = await targetPhrase(page);
      assert.ok(EN_PHRASES.has(phrase), `English phrase: ${phrase}`);
      assert.ok(await shows(page, `${index + 1} of 5`));
      letters += phrase.replace(/ /g, '').length;
      const text = bandText(phrase);
      if (index === 1) {
        // A wrong letter (not a space) a little into the phrase.
        let at = 1;
        while (text[at] === ' ') at += 1;
        const wrong = text[at] === 'x' ? 'z' : 'x';
        await write(page, text.slice(0, at) + wrong);
        assert.equal(await page.locator('.phrase-word--missed').count(), 1, 'the word with a swapped letter is underlined');
        await waitForText(page, 'The marked word had a letter swapped.');
        await press(page, 'Backspace');
        await write(page, text.slice(at, Math.ceil(text.length / 2)));
        await page.waitForTimeout(1100);
        await waitForText(page, 'wpm now');
        const accuracy = await page.locator('.stat-value').nth(2).textContent();
        assert.match(accuracy, /^\d+%$/);
        assert.ok(Number.parseInt(accuracy, 10) < 100, `live accuracy below 100%: ${accuracy}`);
        assert.match(await page.locator('.stat-value').nth(0).textContent(), /^\d+\.\d$/);
        assert.match(await page.locator('.stat-value').nth(1).textContent(), /^0:\d\d$/);
        await waitForText(page, 'Push: space');
        await shot(page, label, '07-phrase');
        await write(page, text.slice(Math.ceil(text.length / 2)));
      } else {
        await write(page, text);
      }
      if (index < 4) {
        await write(page, ' ');
      }
    }
    await waitForPath(page, '/result');
    const accuracy = `${Math.round(((letters - 1) / letters) * 100)}%`;
    await waitForText(page, accuracy);
    const save = await stored(page);
    assert.equal(save.best.phrases[0].accuracy, (letters - 1) / letters);
    const share = (letters - 1) / letters;
    const stars = share >= 0.97 && save.best.phrases[0].wpm >= 5 ? 3 : share >= 0.9 ? 2 : 1;
    assert.equal(save.best.phrases[0].stars, stars);
    assert.equal(await page.locator(`[aria-label="${stars} of 3 stars"]`).count(), 1);
    await waitForText(page, wpmText(save.bestWpm.phrases));

    await press(page, 'Escape');
    await waitForPath(page, '/trail/phrases');
    await waitForFocus(page, new RegExp(`^Short, ${stars} of 3 stars$`));
    await press(page, 'ArrowDown');
    assert.match(await activeLabel(page), /^Everyday, not played yet$/, 'the next phrase level is open');
    assert.ok(await shows(page, 'In Portuguese'), 'the third level names the other language');

    // Home and Progress
    await press(page, 'Escape');
    await waitForPath(page, '/');
    await waitForFocus(page, /^Phrases, Words per minute/);
    await waitForText(page, '1 day');
    await waitForText(page, wpmText(save.bestWpm.phrases));
    await press(page, 'ArrowDown', 2);
    assert.match(await activeLabel(page), /^Progress, /);
    await press(page, 'Enter');
    await waitForPath(page, '/progress');
    await waitForText(page, 'Words per minute, this week');
    const today = await page.locator('.week-day').last().getAttribute('aria-label');
    assert.match(today, /: \d+\.\d wpm$/, `today's bar: ${today}`);
    const cells = await page.locator('.letter-cell').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')));
    assert.equal(cells.length, 26);
    assert.ok(cells.some(cell => /: \d+%$/.test(cell) && Number(cell.match(/(\d+)%$/)[1]) < 100), 'a missed letter below 100%');
    await shot(page, label, '09-progress');
    await press(page, 'Escape');
    await waitForPath(page, '/');
    await waitForFocus(page, /^Progress, /);

    // Everything is kept.
    await page.reload();
    await waitForText(page, 'Writing Trainer');
    await waitForText(page, '1 day');
    assert.deepEqual(await stored(page), save);
    assert.equal(await escapeReachesHost(page), true, 'Back on Home closes the app');
    assert.deepEqual(problems, []);
  } finally {
    await context.close();
  }
}

/** The daily challenge: words for the weak letters, +50 XP once a day. */
async function dailyChallenge(browser) {
  const letters = Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map(letter => [letter, {attempts: 20, hits: 20}]));
  letters.q = {attempts: 20, hits: 4};
  letters.v = {attempts: 20, hits: 8};
  const storage = {version: 1, xp: 0, best: {words: Array(8).fill(null), phrases: Array(4).fill(null)}, bestWpm: {words: 0, phrases: 0}, letters, days: {}, dailyDone: null};
  const {context, page, problems} = await newPage(browser, {storage});
  try {
    await page.goto(APP);
    await waitForFocus(page, /^Words, /);
    await press(page, 'ArrowDown', 2);
    assert.match(await activeLabel(page), /^Daily challenge, .*\+50 XP$/);
    await press(page, 'Enter');
    await waitForPath(page, '/play/daily');
    await waitForText(page, 'Daily challenge');
    const words = [];
    for (let index = 0; index < 10; index += 1) {
      const word = await targetWord(page);
      words.push(word);
      await write(page, bandText(word) + (index < 9 ? ' ' : ''));
    }
    assert.ok(words.filter(word => /[qv]/.test(bandText(word))).length >= 5, `words for q and v: ${words.join(' ')}`);
    await waitForPath(page, '/result');
    const save = await stored(page);
    assert.equal(save.dailyDone != null, true);
    await waitForText(page, `+${save.xp} XP`);
    assert.ok(save.xp > 50);
    await press(page, 'Escape');
    await waitForPath(page, '/');
    await waitForFocus(page, /^Daily challenge, .*Done$/);
    assert.deepEqual(problems, []);
  } finally {
    await context.close();
  }
}

/** Portuguese interface; the "Content language" setting changes only the words and phrases. */
async function languages(browser) {
  const portuguese = await newPage(browser, {locale: 'pt-BR'});
  try {
    const {page} = portuguese;
    await page.goto(APP);
    await waitForText(page, 'Treino de escrita');
    await waitForFocus(page, /^Palavras, Letra a letra · nível 1 de 8/);
    await press(page, 'ArrowDown');
    await press(page, 'Enter');
    await waitForPath(page, '/trail/phrases');
    assert.ok(await shows(page, 'Em inglês'));
    await press(page, 'Enter');
    await waitForPath(page, '/play/phrases/0');
    assert.ok(PT_PHRASES.has(await targetPhrase(page)), 'Portuguese phrases on a Portuguese device');
    await waitForText(page, 'Escreva a frase');
    assert.deepEqual(portuguese.problems, []);
  } finally {
    await portuguese.context.close();
  }
  const english = await newPage(browser, {locale: 'pt-BR', scripts: [fakeConfig({'content.language': 'English'}), FAKE_WRITING]});
  try {
    const {page} = english;
    await page.goto(`${APP}/play/phrases/0`);
    await waitForText(page, 'Frases');
    const phrase = await targetPhrase(page);
    assert.ok(EN_PHRASES.has(phrase), `English phrases with Content language = English: ${phrase}`);
    const trained = (await calls(page)).find(call => call[0] === 'train');
    assert.deepEqual(trained[1], {text: phrase, lang: 'en'});
    assert.deepEqual(english.problems, []);
  } finally {
    await english.context.close();
  }
}

/** The offline package, unzipped and served like the glasses serve it, with the internet blocked. */
async function offlinePackage(browser) {
  const zipPath = path.join(root, 'dist', 'lumen-writing-trainer.mrbd.zip');
  assert.ok(fs.existsSync(zipPath), 'run npm run package first');
  const files = unzipSync(new Uint8Array(fs.readFileSync(zipPath)));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lwt-package-'));
  for (const [name, data] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), {recursive: true});
    fs.writeFileSync(path.join(dir, name), data);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.id, 'dev.lumen.writing-trainer');
  assert.equal(manifest.name, 'Writing Trainer');
  assert.equal(manifest.version, '0.1.0');
  assert.equal('lumen_internet' in manifest, false);
  assert.deepEqual(manifest.lumen_config.map(field => field.key), ['content.language']);
  const server = await startStaticServer(dir, 5500);
  const {context, page, problems} = await newPage(browser);
  const outside = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(PACKAGE_APP)) return route.continue();
    outside.push(url);
    return route.abort();
  });
  try {
    await page.goto(`${PACKAGE_APP}/trail/words`);
    await waitForText(page, 'Alphabet');
    await press(page, 'Enter');
    await waitForPath(page, '/play/words/0');
    await write(page, `${await targetWord(page)}`);
    assert.equal(await page.locator('[aria-label$=", right"]').count(), 1);
    assert.deepEqual(outside.filter(url => !/fonts\.(googleapis|gstatic)\.com/.test(url)), [], 'nothing but the fonts from outside');
    assert.deepEqual(problems, []);
  } finally {
    await context.close();
    server.close();
  }
}

const server = await startStaticServer(path.join(root, 'dist'), 4173);
try {
  for (const name of browsers) {
    const browser = await (name === 'firefox' ? firefox : chromium).launch();
    try {
      await test(`${name}: word round with Lumen's writing API`, () => wordRound(browser, name));
      await test(`${name}: phrase round, Progress and reload`, () => phraseRound(browser, name));
      await test(`${name}: daily challenge`, () => dailyChallenge(browser));
      await test(`${name}: interface and content languages`, () => languages(browser));
      await test(`${name}: offline package`, () => offlinePackage(browser));
    } finally {
      await browser.close();
    }
  }
} finally {
  server.close();
}

const failed = results.filter(result => !result.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
