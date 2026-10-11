// The wearer's progress, kept in localStorage under one versioned key. A value
// that can't be read (broken JSON, an unknown version, the wrong shape) starts
// over from nothing rather than breaking the app.
import {levelsOf, type Level, type Mode} from '../content/levels';
import {addDays} from './dates';
import type {LetterTally, RoundSummary} from './round';
import {DAILY_BONUS_XP, STARS_TO_UNLOCK, starsFor, wordsPerMinute} from './scoring';

export const STORAGE_KEY = 'lumen-writing-trainer';
export const SAVE_VERSION = 1;
/** Days of history kept (the Progress chart shows the last 7). */
const DAYS_KEPT = 120;

export type Stars = 1 | 2 | 3;

/** The best a level was played: each field is the best of any round. */
export type LevelBest = {stars: Stars; wpm: number; accuracy: number};

/** What was written on one day, for the speed of that day. */
export type DayLog = {characters: number; ms: number; rounds: number};

export type Save = {
  version: typeof SAVE_VERSION;
  xp: number;
  best: Record<Mode, (LevelBest | null)[]>;
  bestWpm: Record<Mode, number>;
  letters: LetterTally;
  days: Record<string, DayLog>;
  /** The day the daily challenge last gave its bonus. */
  dailyDone: string | null;
};

export function freshSave(): Save {
  return {
    version: SAVE_VERSION,
    xp: 0,
    best: {words: levelsOf('words').map(() => null), phrases: levelsOf('phrases').map(() => null)},
    bestWpm: {words: 0, phrases: 0},
    letters: {},
    days: {},
    dailyDone: null,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value != null && !Array.isArray(value);

const count = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0);

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A stored value as a Save: unknown or broken values start fresh, missing fields take their defaults. */
export function migrate(raw: unknown): Save {
  const save = freshSave();
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) {
    return save;
  }
  save.xp = count(raw.xp);
  for (const mode of ['words', 'phrases'] as const) {
    const best = isRecord(raw.best) && Array.isArray(raw.best[mode]) ? raw.best[mode] : [];
    save.best[mode] = save.best[mode].map((_, index) => {
      const entry: unknown = best[index];
      if (!isRecord(entry) || ![1, 2, 3].includes(entry.stars as number)) {
        return null;
      }
      return {stars: entry.stars as Stars, wpm: count(entry.wpm), accuracy: Math.min(1, count(entry.accuracy))};
    });
    save.bestWpm[mode] = isRecord(raw.bestWpm) ? count(raw.bestWpm[mode]) : 0;
  }
  if (isRecord(raw.letters)) {
    for (const [letter, tally] of Object.entries(raw.letters)) {
      if (/^[a-z]$/.test(letter) && isRecord(tally)) {
        const attempts = count(tally.attempts);
        save.letters[letter] = {attempts, hits: Math.min(attempts, count(tally.hits))};
      }
    }
  }
  if (isRecord(raw.days)) {
    for (const [day, log] of Object.entries(raw.days)) {
      if (DAY.test(day) && isRecord(log)) {
        save.days[day] = {characters: count(log.characters), ms: count(log.ms), rounds: count(log.rounds)};
      }
    }
  }
  save.dailyDone = typeof raw.dailyDone === 'string' && DAY.test(raw.dailyDone) ? raw.dailyDone : null;
  return save;
}

export function loadSave(storage: Pick<Storage, 'getItem'>): Save {
  try {
    const text = storage.getItem(STORAGE_KEY);
    return migrate(text == null ? null : JSON.parse(text));
  } catch {
    return freshSave();
  }
}

export function storeSave(storage: Pick<Storage, 'setItem'>, save: Save): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Storage full or unavailable: the progress lives on in memory.
  }
}

/** Whether a level of the trail can be played: the first always, the others after ★★ on the one before. */
export function isUnlocked(save: Save, mode: Mode, index: number): boolean {
  return index <= 0 || (save.best[mode][index - 1]?.stars ?? 0) >= STARS_TO_UNLOCK;
}

/** The furthest level the wearer can play on a trail. */
export function currentLevel(save: Save, mode: Mode): number {
  let index = 0;
  while (index + 1 < save.best[mode].length && isUnlocked(save, mode, index + 1)) {
    index += 1;
  }
  return index;
}

/** Days in a row, up to today, with a finished round (yesterday's streak lasts until today ends). */
export function streak(save: Save, today: string): number {
  const played = (day: string) => (save.days[day]?.rounds ?? 0) > 0;
  let day = played(today) ? today : addDays(today, -1);
  let days = 0;
  while (played(day)) {
    days += 1;
    day = addDays(day, -1);
  }
  return days;
}

/** Speed of each of the last 7 days (today last), or null for a day without a round. */
export function week(save: Save, today: string): {day: string; wpm: number | null}[] {
  return Array.from({length: 7}, (_, index) => {
    const day = addDays(today, index - 6);
    const log = save.days[day];
    return {day, wpm: log != null && log.rounds > 0 ? wordsPerMinute(log.characters, log.ms) : null};
  });
}

export type RoundOutcome = {
  save: Save;
  stars: Stars;
  /** Experience gained: the round's points, plus the daily challenge's bonus. */
  xp: number;
  bonus: number;
  /** A new best speed for the mode. */
  record: boolean;
  /** The trail level this round opened, if any. */
  unlocked: number | null;
};

/** The progress after a finished round of `level`, played on `today`. */
export function applyRound(previous: Save, level: Level, summary: RoundSummary, today: string): RoundOutcome {
  const save = structuredCloneSave(previous);
  const {mode} = level;
  const stars = starsFor(summary.accuracy, summary.wpm, level.goalWpm);
  const wasUnlocked = isUnlocked(previous, mode, level.index + 1);
  if (level.index >= 0) {
    const best = save.best[mode][level.index];
    save.best[mode][level.index] = {
      stars: Math.max(best?.stars ?? 1, stars) as Stars,
      wpm: Math.max(best?.wpm ?? 0, summary.wpm),
      accuracy: Math.max(best?.accuracy ?? 0, summary.accuracy),
    };
  }
  const record = previous.bestWpm[mode] > 0 && summary.wpm > previous.bestWpm[mode];
  save.bestWpm[mode] = Math.max(save.bestWpm[mode], summary.wpm);
  for (const [letter, tally] of Object.entries(summary.letters)) {
    const kept = (save.letters[letter] ??= {attempts: 0, hits: 0});
    kept.attempts += tally.attempts;
    kept.hits += tally.hits;
  }
  const day = (save.days[today] ??= {characters: 0, ms: 0, rounds: 0});
  day.characters += summary.characters;
  day.ms += summary.ms;
  day.rounds += 1;
  const oldest = addDays(today, -DAYS_KEPT);
  for (const key of Object.keys(save.days)) {
    if (key < oldest) {
      delete save.days[key];
    }
  }
  let bonus = 0;
  if (level.id === 'daily' && save.dailyDone !== today) {
    bonus = DAILY_BONUS_XP;
    save.dailyDone = today;
  }
  save.xp += summary.points + bonus;
  const next = level.index + 1;
  const unlocked =
    level.index >= 0 && next < save.best[mode].length && !wasUnlocked && isUnlocked(save, mode, next) ? next : null;
  return {save, stars, xp: summary.points + bonus, bonus, record, unlocked};
}

function structuredCloneSave(save: Save): Save {
  return JSON.parse(JSON.stringify(save)) as Save;
}
