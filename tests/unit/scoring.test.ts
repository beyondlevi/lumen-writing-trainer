import {describe, expect, it} from 'vitest';
import {levelForXp, nextCombo, starsFor, wordPoints, wordsPerMinute, xpForLevel} from '../../src/game/scoring';

describe('points and combo', () => {
  it('gives 10 a word, 5 more without an error, times the combo', () => {
    expect(wordPoints(true, 1)).toBe(15);
    expect(wordPoints(true, 3)).toBe(45);
    expect(wordPoints(false, 1)).toBe(10);
  });

  it('breaks the combo on a word with an error', () => {
    expect(wordPoints(false, 4)).toBe(10);
    expect(nextCombo(4, false)).toBe(1);
  });

  it('raises the combo up to x5', () => {
    expect(nextCombo(1, true)).toBe(2);
    expect(nextCombo(4, true)).toBe(5);
    expect(nextCombo(5, true)).toBe(5);
  });
});

describe('stars', () => {
  it('gives one star for finishing, two at 90%, three at 97% with the level speed', () => {
    expect(starsFor(0.5, 20, 5)).toBe(1);
    expect(starsFor(0.89, 20, 5)).toBe(1);
    expect(starsFor(0.9, 2, 5)).toBe(2);
    expect(starsFor(0.97, 4.9, 5)).toBe(2);
    expect(starsFor(0.97, 5, 5)).toBe(3);
    expect(starsFor(1, 8, 8)).toBe(3);
  });
});

describe('words per minute', () => {
  it('is characters ÷ 5 ÷ minutes', () => {
    expect(wordsPerMinute(50, 60000)).toBe(10);
    expect(wordsPerMinute(25, 30000)).toBe(10);
    expect(wordsPerMinute(10, 0)).toBe(0);
    expect(wordsPerMinute(0, 1000)).toBe(0);
  });
});

describe('experience and level', () => {
  it('completes level n at 100·n·(n+1)/2', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([100, 300, 600, 1000]);
  });

  it('starts at level 1 and counts what is missing for the next', () => {
    expect(levelForXp(0)).toEqual({level: 1, into: 0, span: 100, missing: 100});
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100)).toEqual({level: 2, into: 0, span: 200, missing: 200});
    expect(levelForXp(340)).toEqual({level: 3, into: 40, span: 300, missing: 260});
    expect(levelForXp(960)).toEqual({level: 4, into: 360, span: 400, missing: 40});
  });
});
