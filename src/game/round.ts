// One round, read from the text field. The app never changes the field while
// the band writes: every `input` hands the whole value to `update`, which splits
// it into the round's words (or phrases), compares it letter by letter with the
// expected text and keeps what can't be read from the value alone: whether
// each letter came out right the first time, the combo, the points and the
// time spent writing (pauses excluded).
import type {Item, Mode} from '../content/levels';
import {nextCombo, wordPoints, wordsPerMinute} from './scoring';
import {fold, letterKey, sameLetter} from './text';

/** What was written for one word or phrase, and whether the wearer has moved past it. */
export type Segment = {typed: string; ended: boolean};

/**
 * Splits a word round's value: the current word is the one after as many
 * spaces as were written (repeated spaces count once). A word that grows past
 * its length goes on as the next word, as if a space had come.
 */
export function splitWords(value: string, targets: readonly Item[]): Segment[] {
  const segments: Segment[] = [];
  let current = '';
  for (const character of value) {
    if (segments.length >= targets.length) {
      break;
    }
    if (character === ' ') {
      if (current !== '') {
        segments.push({typed: current, ended: true});
        current = '';
      }
      continue;
    }
    current += character;
    if (current.length > [...targets[segments.length].text].length) {
      segments.push({typed: current.slice(0, -1), ended: true});
      current = character;
    }
  }
  if (current !== '' && segments.length < targets.length) {
    segments.push({typed: current, ended: false});
  }
  return segments;
}

/**
 * Splits a phrase round's value: a phrase ends when it is written exactly, or
 * when what was written reaches its length and a space follows. Spaces before
 * a phrase are skipped.
 */
export function splitPhrases(value: string, targets: readonly Item[]): Segment[] {
  const segments: Segment[] = [];
  let position = 0;
  for (const target of targets) {
    while (value[position] === ' ') {
      position += 1;
    }
    const rest = value.slice(position);
    if (rest === '') {
      break;
    }
    const length = target.text.length;
    if (rest.length >= length && fold(rest.slice(0, length), target.caseSensitive) === fold(target.text, target.caseSensitive)) {
      segments.push({typed: rest.slice(0, length), ended: true});
      position += length;
      continue;
    }
    const space = rest.indexOf(' ', length);
    if (space < 0) {
      segments.push({typed: rest, ended: false});
      break;
    }
    segments.push({typed: rest.slice(0, space), ended: true});
    position += space + 1;
  }
  return segments;
}

export type LetterState = 'right' | 'wrong' | 'next' | 'pending';

/** One expected character as written so far. */
export type Letter = {expected: string; written: string | null; state: LetterState};

/** The expected characters of `target` against what was written for it. */
export function lettersOf(typed: string, target: Item): Letter[] {
  const written = [...typed];
  return [...target.text].map((expected, index) => {
    if (index < written.length) {
      const right = sameLetter(written[index], expected, target.caseSensitive);
      return {expected, written: written[index], state: right ? 'right' : 'wrong'};
    }
    return {expected, written: null, state: index === written.length ? 'next' : 'pending'};
  });
}

/** A word that has been scored. */
export type Settled = {
  target: number;
  points: number;
  clean: boolean;
  errors: number;
  /** The combo for the next word. */
  combo: number;
};

/** Tries and first-time hits per letter a–z. */
export type LetterTally = Record<string, {attempts: number; hits: number}>;

export type RoundSummary = {
  wpm: number;
  /** Letters right the first time ÷ letters of the round's text, 0 to 1. */
  accuracy: number;
  /** Time from the first letter to the last, pauses excluded. */
  ms: number;
  characters: number;
  points: number;
  maxCombo: number;
  letters: LetterTally;
  /** Up to three letters missed most in the round, worst first. */
  worst: string[];
};

type Unit = {target: number; from: number; to: number};

export class RoundTracker {
  readonly mode: Mode;
  readonly targets: readonly Item[];
  segments: Segment[] = [];
  combo = 1;
  maxCombo = 1;
  points = 0;
  done = false;
  /** Scores of the words so far, by target (word rounds) or by word (phrase rounds). */
  readonly settled: Settled[] = [];
  startedAt: number | null = null;
  lastAt: number | null = null;

  private readonly firstTry: (boolean | undefined)[][];
  private readonly units: Unit[][];
  private settledTargets = 0;
  private length = 0;
  private readonly pauses: {from: number; to: number | null}[] = [];

  constructor(mode: Mode, targets: readonly Item[]) {
    this.mode = mode;
    this.targets = targets;
    this.firstTry = targets.map(() => []);
    // A word round scores each word; a phrase round each word of each phrase.
    this.units = targets.map((target, index) => {
      if (mode === 'words') {
        return [{target: index, from: 0, to: target.text.length}];
      }
      const units: Unit[] = [];
      let from = 0;
      for (const word of target.text.split(' ')) {
        units.push({target: index, from, to: from + word.length});
        from += word.length + 1;
      }
      return units;
    });
  }

  /** Reads the field's value; returns the words scored by it. */
  update(value: string, now: number): Settled[] {
    if (this.done) {
      return [];
    }
    if (this.startedAt == null && value.trim() !== '') {
      this.startedAt = now;
    }
    if (value.length > this.length) {
      this.lastAt = now;
    }
    this.length = value.length;
    this.segments = this.mode === 'words' ? splitWords(value, this.targets) : splitPhrases(value, this.targets);
    this.segments.forEach((segment, index) => this.record(index, segment.typed));
    const settled: Settled[] = [];
    while (this.settledTargets < this.segments.length && this.isSettled(this.settledTargets)) {
      settled.push(...this.settle(this.settledTargets));
      this.settledTargets += 1;
    }
    if (this.settledTargets === this.targets.length) {
      this.done = true;
      if (this.paused) {
        this.resume(now);
      }
    }
    return settled;
  }

  /** The word or phrase being written (the round's length once done). */
  current(): number {
    const count = this.segments.length;
    if (count === 0) {
      return 0;
    }
    return this.segments[count - 1].ended ? count : count - 1;
  }

  /** Whether target `index` reads exactly as expected. */
  complete(index: number): boolean {
    const segment = this.segments[index];
    if (segment == null) {
      return false;
    }
    const letters = lettersOf(segment.typed, this.targets[index]);
    return [...segment.typed].length === letters.length && letters.every(letter => letter.state === 'right');
  }

  /** What is still to be written, from the end of the field (for Lumen's handwriting training). */
  remainingText(): string {
    const index = this.current();
    if (index >= this.targets.length) {
      return '';
    }
    const segment = this.segments[index];
    const target = this.targets[index].text;
    if (this.mode === 'phrases') {
      return segment == null ? target : target.slice(segment.typed.length);
    }
    const parts: string[] = [];
    let next = index;
    if (segment != null && !segment.ended) {
      parts.push(target.slice([...segment.typed].length));
      next = index + 1;
    }
    for (let i = next; i < this.targets.length; i += 1) {
      parts.push(this.targets[i].text);
    }
    return parts.join(' ');
  }

  get paused(): boolean {
    const last = this.pauses.at(-1);
    return last != null && last.to == null;
  }

  pause(now: number): void {
    if (!this.paused && !this.done) {
      this.pauses.push({from: now, to: null});
    }
  }

  resume(now: number): void {
    const last = this.pauses.at(-1);
    if (last != null && last.to == null) {
      last.to = now;
    }
  }

  /** Time spent writing, from the first letter to `until`, pauses excluded. */
  activeMs(until: number): number {
    if (this.startedAt == null) {
      return 0;
    }
    const start = this.startedAt;
    const paused = this.pauses.reduce((sum, pause) => {
      const from = Math.max(pause.from, start);
      const to = Math.min(pause.to ?? until, until);
      return sum + Math.max(0, to - from);
    }, 0);
    return Math.max(0, until - start - paused);
  }

  /** Characters written: the round's words or phrases, with one space between each. */
  characters(): number {
    const written = this.segments.filter(segment => segment.typed !== '');
    return written.reduce((sum, segment) => sum + [...segment.typed].length, 0) + Math.max(0, written.length - 1);
  }

  /** Words per minute so far. */
  liveWpm(now: number): number {
    return wordsPerMinute(this.characters(), this.activeMs(now));
  }

  /** Letters right the first time ÷ letters written so far (1 before any). */
  liveAccuracy(): number {
    let tries = 0;
    let hits = 0;
    this.firstTry.forEach((positions, index) => {
      const text = [...this.targets[index].text];
      positions.forEach((hit, position) => {
        if (hit != null && text[position] !== ' ') {
          tries += 1;
          hits += hit ? 1 : 0;
        }
      });
    });
    return tries === 0 ? 1 : hits / tries;
  }

  /** Whether the letter at `position` of target `index` was wrong the first time. */
  missedFirst(index: number, position: number): boolean {
    return this.firstTry[index][position] === false;
  }

  summary(): RoundSummary {
    const letters: LetterTally = {};
    let total = 0;
    let hits = 0;
    this.targets.forEach((target, index) => {
      [...target.text].forEach((expected, position) => {
        if (expected === ' ') {
          return;
        }
        const hit = this.firstTry[index][position] === true;
        total += 1;
        hits += hit ? 1 : 0;
        const key = letterKey(expected);
        if (key != null) {
          const tally = (letters[key] ??= {attempts: 0, hits: 0});
          tally.attempts += 1;
          tally.hits += hit ? 1 : 0;
        }
      });
    });
    const ms = this.lastAt == null ? 0 : this.activeMs(this.lastAt);
    const characters = this.characters();
    return {
      wpm: wordsPerMinute(characters, ms),
      accuracy: total === 0 ? 1 : hits / total,
      ms,
      characters,
      points: this.points,
      maxCombo: this.maxCombo,
      letters,
      worst: worstLetters(letters),
    };
  }

  private record(index: number, typed: string): void {
    const target = this.targets[index];
    const expected = [...target.text];
    const written = [...typed];
    const positions = this.firstTry[index];
    for (let position = 0; position < Math.min(written.length, expected.length); position += 1) {
      positions[position] ??= sameLetter(written[position], expected[position], target.caseSensitive);
    }
  }

  private isSettled(index: number): boolean {
    const segment = this.segments[index];
    return segment.ended || (this.mode === 'words' && this.complete(index));
  }

  private settle(index: number): Settled[] {
    const text = [...this.targets[index].text];
    return this.units[index].map(unit => {
      let errors = 0;
      for (let position = unit.from; position < unit.to; position += 1) {
        if (text[position] !== ' ' && this.firstTry[index][position] !== true) {
          errors += 1;
        }
      }
      const clean = errors === 0;
      const points = wordPoints(clean, this.combo);
      this.points += points;
      this.combo = nextCombo(this.combo, clean);
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      const settled = {target: index, points, clean, errors, combo: this.combo};
      this.settled.push(settled);
      return settled;
    });
  }
}

/** Up to three letters with misses, the highest share of misses first. */
export function worstLetters(letters: LetterTally, count = 3): string[] {
  return Object.entries(letters)
    .filter(([, tally]) => tally.attempts > tally.hits)
    .sort(([a, x], [b, y]) => {
      const share = (y.attempts - y.hits) / y.attempts - (x.attempts - x.hits) / x.attempts;
      return share || y.attempts - y.hits - (x.attempts - x.hits) || a.localeCompare(b);
    })
    .slice(0, count)
    .map(([letter]) => letter);
}
