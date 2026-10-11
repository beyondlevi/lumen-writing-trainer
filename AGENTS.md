# Working on this app

A [Rokid Lumen](https://github.com/beyondlevi/rokid-lumen) web app, run offline on Rokid glasses
from a `.mrbd.zip` package: a game that teaches writing with the Meta Neural Band. Lumen's guide for
apps is [docs/building-apps.md](https://github.com/beyondlevi/rokid-lumen/blob/main/docs/building-apps.md).
It uses the UI Toolkit for Meta Ray-Ban Display and follows the approved design in `docs/design`.

## Rules

- **Text comes through a real text field** and Lumen's keyboard, which writes with the band: no
  other way to read the band's handwriting exists. The app never sets the field while the band
  writes; it reads it.
- **Lumen's writing API** (`window.lumen.writing`, feature-detected; the app works without it):
  - `train({text, lang})`: before a round, the text the wearer is about to write in the focused
    field (the round's words separated by spaces, or the phrase). Lumen then writes with the band
    at the index tap (no choice), shows a small bar under the app instead of its panel, turns its
    suggestions and corrections off, and compares what the band reads with this text to learn the
    wearer's handwriting (kept on the glasses). `train(null)` clears it.
  - `onState(cb)`: `'off' | 'preparing' | 'writing'`; returns a function that removes `cb`.
  - `stop()`: ends the band's writing (the round is over).
- **The band drives it as keys** elsewhere: swipes are arrows, the index tap is `Enter`, the middle
  tap is Back (`Escape`). While the band writes, its gestures belong to the writing.
- **Words compare without accents or case**: the band has no accented letters ("não" is written
  "nao").
- **Fast navigation** (Lumen's guide, "Fast navigation: lists and Back"): lists stay mounted, Back
  within 100 ms with the CPU throttled 6x.
- **Save every change** in `localStorage`; a broken value starts fresh.
- **The screen is 600 x 600 CSS px**, black is see-through, the display is green: right and wrong
  differ by shape, not by hue.
- **Offline**: no `lumen_internet`, nothing loaded from the internet.
- **English first, multilingual from the start**: every text in the i18n catalog, English by
  default and Brazilian Portuguese (`pt`). Code, comments, docs and commits in English.
- **GeckoView only** (Firefox 156 on the glasses).
