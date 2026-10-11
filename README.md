# Writing Trainer for Lumen

Learn to write with the Meta Neural Band on [Rokid Lumen](https://github.com/beyondlevi/rokid-lumen)
glasses, as a game: words letter by letter first, then phrases, with your speed in words per
minute, a trail of levels, combos, stars and a daily streak. What you write in it also teaches
Lumen your handwriting, so its suggestions and corrections get better for you.

An offline Lumen web app (`.mrbd.zip`), built with React, Vite, TypeScript and the
[UI Toolkit for Meta Ray-Ban Display](https://github.com/facebook/meta-ray-ban-display-ui-toolkit-web).
English first, with Brazilian Portuguese. The approved design is in [docs/design](docs/design).

MIT licensed.

## How it plays

- **Home**: your streak, level and best speed, the experience to the next level, and four
  places: **Words**, **Phrases**, the **Daily challenge** (+50 XP once a day) and **Progress**.
- **The trail**: each mode's levels from top to bottom. A level opens with two stars on the one
  before it; a locked level takes the focus and says so.
- **A word round**: 10 words of the level. Each letter is a tile: filled with a check when it came
  out right, outlined with a cross when the band read another letter (with the letter it should
  be under it), the next one with the focus look. The glasses show everything in green, so right
  and wrong differ by shape, never by hue alone. A space (the band's push forward) ends a word,
  even with errors; the last right letter of the last word ends the round.
- **A phrase round**: 5 phrases, with words per minute, time and accuracy live. A word that had a
  wrong letter stays underlined.
- **The result**: 1 to 3 stars, speed (and a record), accuracy, time, best combo, the experience
  gained and the three letters the band missed most. **Next round** and **Repeat**.
- **Progress**: words per minute on each of the last 7 days, and the share of each letter a to z
  that came out right the first time (below 80%, outlined).

| Level | Words | Phrases |
| --- | --- | --- |
| 1 | Alphabet (single letters), 6 wpm for ★★★ | Short (3–4 words), 5 wpm |
| 2 | 2 and 3 letters, 5 wpm | Everyday (5–7 words), 6 wpm |
| 3 | 4 and 5 letters, 5 wpm | In the other language, 5 wpm |
| 4 | Look-alike letters (l/i, o/a, v/r/u, n/m, a/d/q/g), 4 wpm | Fast (everyday phrases), 8 wpm |
| 5 | No accents (shown with them, written without), 4 wpm | |
| 6 | Long words (7+ letters), 4 wpm | |
| 7 | Capitals (names: case counts here), 3 wpm | |
| 8 | Master (all of the above), 6 wpm | |

The rules, as the code keeps them (`src/game`):

- Letters compare without accents, and without case except in Capitals.
- A letter counts as right only if it came out right the first time; one fixed later is a miss,
  and so is a letter left out when a space ends the word early.
- Points per word: 10, plus 5 without an error, times the combo (x1 to x5). The combo goes up with
  each word without an error; a word with an error scores 10 and takes it back to x1.
- Stars: ★ for finishing, ★★ at 90% accuracy, ★★★ at 97% with the level's speed.
- Words per minute: characters written (spaces between words included) ÷ 5 ÷ minutes, from the
  first letter to the last, pauses excluded.
- Experience is the points of every round (and the daily bonus). You start at level 1; level n is
  done at 100·n·(n+1)/2 XP in total (100, 300, 600…).
- The streak counts the days in a row with a finished round (local dates); a day without one
  starts it over.
- The daily challenge draws 10 words for the letters you miss most (look-alike letters before
  there is any history), the same words all day.
- Everything is kept in `localStorage` (`lumen-writing-trainer`, versioned); a value that can't be
  read starts over.

## On the glasses

The text comes through a real text field and Lumen's keyboard: the index tap on the field writes
with the band. The app clears the field before a round and then only reads it.

With Lumen's writing API (`window.lumen.writing`, feature-detected), the app:

- calls `train({text, lang})` before a round with the round's words (or each phrase), and again
  when the wearer continues after a pause, with what is left to write;
- shows *Preparing the band…* while `onState` says `'preparing'`, and a pause when it says
  `'off'` in the middle of a round (the clock stops);
- calls `stop()` and `train(null)` when the round ends or the wearer leaves it.

Without it (an older Lumen, a desktop browser) the game works the same, through Lumen's panel.

Settings (`lumen_config`, from the phone): **Content language**: Auto (the device's language),
English or Português. It changes the words and phrases only; the interface follows the device.
In a desktop browser, `?content.language=pt` does the same.

## Develop

```sh
npm ci
npm run dev              # http://localhost:5173
npm run typecheck
npm test                 # unit tests (Vitest)
npm run build
npm run test:e2e         # Chromium and Firefox, keyboard only (npx playwright install chromium firefox)
npm run perf             # navigation timing, CPU throttled 6x
npm run package          # dist/lumen-writing-trainer.mrbd.zip
npm run captures         # 600x600 captures of every screen, next to the design boards
npm run icons            # public/icon-*.png
```

Install the package on the glasses as Lumen's guide says (`scripts/push-webapp.sh` in
rokid-lumen, or the companion's Apps tab).

### Navigation speed

Home and both trails stay mounted above the routes (`src/components/KeptPage.tsx`), so Back to
them only brings them back on top. `npm run perf` measures it on Chromium with the CPU throttled
6x (the glasses' speed), from the key to the frame with the screen fully drawn; it fails when a
Back takes more than 100 ms.
