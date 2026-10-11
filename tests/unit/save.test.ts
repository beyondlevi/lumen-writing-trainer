import {describe, expect, it} from 'vitest';
import {DAILY_LEVEL, PHRASE_LEVELS, WORD_LEVELS} from '../../src/content/levels';
import type {RoundSummary} from '../../src/game/round';
import {
  applyRound,
  currentLevel,
  freshSave,
  isUnlocked,
  loadSave,
  migrate,
  SAVE_VERSION,
  STORAGE_KEY,
  storeSave,
  streak,
  week,
} from '../../src/game/save';

const summary = (overrides: Partial<RoundSummary> = {}): RoundSummary => ({
  wpm: 6,
  accuracy: 0.95,
  ms: 60000,
  characters: 30,
  points: 120,
  maxCombo: 4,
  letters: {a: {attempts: 4, hits: 3}, s: {attempts: 2, hits: 2}},
  worst: ['a'],
  ...overrides,
});

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
};

describe('storage', () => {
  it('starts fresh from nothing, broken JSON, another shape or an unknown version', () => {
    expect(migrate(null)).toEqual(freshSave());
    expect(migrate('text')).toEqual(freshSave());
    expect(migrate([1, 2])).toEqual(freshSave());
    expect(migrate({version: SAVE_VERSION + 1, xp: 500})).toEqual(freshSave());
    const storage = memoryStorage();
    storage.setItem(STORAGE_KEY, '{not json');
    expect(loadSave(storage)).toEqual(freshSave());
  });

  it('keeps what is valid in a stored value and fills in the rest', () => {
    const save = migrate({
      version: SAVE_VERSION,
      xp: 340,
      best: {words: [{stars: 3, wpm: 6, accuracy: 1}, {stars: 7}, 'x']},
      letters: {a: {attempts: 10, hits: 12}, '?': {attempts: 1, hits: 1}, b: 'x'},
      days: {'2026-10-10': {characters: 40, ms: 60000, rounds: 2}, yesterday: {}},
      dailyDone: 'today',
    });
    expect(save.xp).toBe(340);
    expect(save.best.words).toHaveLength(WORD_LEVELS.length);
    expect(save.best.words.slice(0, 3)).toEqual([{stars: 3, wpm: 6, accuracy: 1}, null, null]);
    expect(save.best.phrases).toEqual(PHRASE_LEVELS.map(() => null));
    expect(save.letters).toEqual({a: {attempts: 10, hits: 10}});
    expect(Object.keys(save.days)).toEqual(['2026-10-10']);
    expect(save.dailyDone).toBeNull();
  });

  it('round-trips through localStorage', () => {
    const storage = memoryStorage();
    const {save} = applyRound(freshSave(), WORD_LEVELS[0], summary(), '2026-10-11');
    storeSave(storage, save);
    expect(JSON.parse(storage.data.get(STORAGE_KEY) ?? '').version).toBe(SAVE_VERSION);
    expect(loadSave(storage)).toEqual(save);
  });
});

describe('unlocking', () => {
  it('opens the first level of each trail from the start', () => {
    const save = freshSave();
    expect(isUnlocked(save, 'words', 0)).toBe(true);
    expect(isUnlocked(save, 'words', 1)).toBe(false);
    expect(isUnlocked(save, 'phrases', 0)).toBe(true);
    expect(currentLevel(save, 'words')).toBe(0);
  });

  it('opens the next level with two stars, not with one', () => {
    const one = applyRound(freshSave(), WORD_LEVELS[0], summary({accuracy: 0.5}), '2026-10-11');
    expect(one.stars).toBe(1);
    expect(one.unlocked).toBeNull();
    expect(isUnlocked(one.save, 'words', 1)).toBe(false);
    const two = applyRound(one.save, WORD_LEVELS[0], summary({accuracy: 0.92}), '2026-10-11');
    expect(two.stars).toBe(2);
    expect(two.unlocked).toBe(1);
    expect(currentLevel(two.save, 'words')).toBe(1);
    const again = applyRound(two.save, WORD_LEVELS[0], summary({accuracy: 0.5}), '2026-10-11');
    expect(again.unlocked).toBeNull();
    expect(again.save.best.words[0]?.stars).toBe(2);
  });

  it('keeps the best of every round per level', () => {
    let {save} = applyRound(freshSave(), WORD_LEVELS[0], summary({wpm: 7, accuracy: 0.9}), '2026-10-11');
    ({save} = applyRound(save, WORD_LEVELS[0], summary({wpm: 6, accuracy: 0.99}), '2026-10-11'));
    expect(save.best.words[0]).toEqual({stars: 3, wpm: 7, accuracy: 0.99});
  });
});

describe('a finished round', () => {
  it('adds its points as experience and its letters to the history', () => {
    const outcome = applyRound(freshSave(), WORD_LEVELS[0], summary(), '2026-10-11');
    expect(outcome.xp).toBe(120);
    expect(outcome.save.xp).toBe(120);
    expect(outcome.save.letters).toEqual({a: {attempts: 4, hits: 3}, s: {attempts: 2, hits: 2}});
    expect(outcome.save.days['2026-10-11']).toEqual({characters: 30, ms: 60000, rounds: 1});
  });

  it('marks a new best speed of the mode as a record', () => {
    const first = applyRound(freshSave(), WORD_LEVELS[0], summary({wpm: 5}), '2026-10-11');
    expect(first.record).toBe(false);
    const faster = applyRound(first.save, WORD_LEVELS[0], summary({wpm: 6}), '2026-10-11');
    expect(faster.record).toBe(true);
    const phrases = applyRound(faster.save, PHRASE_LEVELS[0], summary({wpm: 4}), '2026-10-11');
    expect(phrases.record).toBe(false);
    expect(phrases.save.bestWpm).toEqual({words: 6, phrases: 4});
  });

  it('gives the daily challenge its bonus once a day', () => {
    const first = applyRound(freshSave(), DAILY_LEVEL, summary(), '2026-10-11');
    expect(first.bonus).toBe(50);
    expect(first.save.xp).toBe(170);
    expect(first.save.dailyDone).toBe('2026-10-11');
    const second = applyRound(first.save, DAILY_LEVEL, summary(), '2026-10-11');
    expect(second.bonus).toBe(0);
    expect(second.save.xp).toBe(290);
    const nextDay = applyRound(second.save, DAILY_LEVEL, summary(), '2026-10-12');
    expect(nextDay.bonus).toBe(50);
    expect(first.save.best).toEqual(freshSave().best);
  });
});

describe('streak and week', () => {
  const played = (...days: string[]) => {
    const save = freshSave();
    for (const day of days) save.days[day] = {characters: 50, ms: 60000, rounds: 1};
    return save;
  };

  it('counts days in a row up to today', () => {
    expect(streak(played('2026-10-09', '2026-10-10', '2026-10-11'), '2026-10-11')).toBe(3);
  });

  it('keeps yesterday’s streak until today ends', () => {
    expect(streak(played('2026-10-09', '2026-10-10'), '2026-10-11')).toBe(2);
  });

  it('drops to zero after a day without a round', () => {
    expect(streak(played('2026-10-08', '2026-10-09'), '2026-10-11')).toBe(0);
    expect(streak(played('2026-10-07', '2026-10-09', '2026-10-10', '2026-10-11'), '2026-10-11')).toBe(3);
  });

  it('crosses months', () => {
    expect(streak(played('2026-09-30', '2026-10-01'), '2026-10-01')).toBe(2);
  });

  it('gives the speed of each of the last 7 days', () => {
    const days = week(played('2026-10-05', '2026-10-11'), '2026-10-11');
    expect(days.map(day => day.day)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
    expect(days[0].wpm).toBe(10);
    expect(days[1].wpm).toBeNull();
    expect(days[6].wpm).toBe(10);
  });
});
