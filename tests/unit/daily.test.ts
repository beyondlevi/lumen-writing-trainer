import {describe, expect, it} from 'vitest';
import {EN} from '../../src/content/wordsEn';
import {PT} from '../../src/content/wordsPt';
import {dailyWords, weakLetters} from '../../src/game/daily';
import {fold} from '../../src/game/text';

describe('daily challenge', () => {
  it('draws ten different look-alike letter words without history', () => {
    const words = dailyWords('pt', {}, '2026-10-11').map(item => item.text);
    expect(words).toHaveLength(10);
    expect(new Set(words).size).toBe(10);
    for (const word of words) expect(PT.words.similar).toContain(word);
  });

  it('draws the same words all day, others the next day', () => {
    const today = dailyWords('en', {}, '2026-10-11').map(item => item.text);
    expect(dailyWords('en', {}, '2026-10-11').map(item => item.text)).toEqual(today);
    expect(dailyWords('en', {}, '2026-10-12').map(item => item.text)).not.toEqual(today);
  });

  it('weighs the draw towards the letters the band misses most', () => {
    const letters = {
      q: {attempts: 20, hits: 5},
      v: {attempts: 20, hits: 8},
      a: {attempts: 100, hits: 99},
      e: {attempts: 100, hits: 100},
    };
    expect(weakLetters(letters).map(entry => entry.letter)).toEqual(['q', 'v', 'a']);
    const words = dailyWords('en', letters, '2026-10-11').map(item => fold(item.text));
    expect(words).toHaveLength(10);
    const withWeak = words.filter(word => /[qv]/.test(word));
    expect(withWeak.length).toBeGreaterThanOrEqual(5);
    for (const word of words) expect(EN.words.capitals).not.toContain(word);
  });
});
