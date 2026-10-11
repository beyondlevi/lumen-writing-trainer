import {describe, expect, it} from 'vitest';
import type {Bank} from '../../src/content/bank';
import {drawRound, levelPool, PHRASE_LEVELS, ROUND_SIZE, WORD_LEVELS} from '../../src/content/levels';
import {EN} from '../../src/content/wordsEn';
import {PT} from '../../src/content/wordsPt';
import {seeded} from '../../src/game/random';
import {fold, hasAccent} from '../../src/game/text';

describe.each([
  ['en', EN],
  ['pt', PT],
] as [string, Bank][])('%s lists', (_, bank) => {
  it('have at least 60 words per level and 30 phrases per list', () => {
    for (const words of Object.values(bank.words)) expect(words.length).toBeGreaterThanOrEqual(60);
    for (const phrases of Object.values(bank.phrases)) expect(phrases.length).toBeGreaterThanOrEqual(30);
  });

  it('only use letters the band can write once accents are dropped', () => {
    for (const word of Object.values(bank.words).flat()) expect(fold(word, true)).toMatch(/^[a-zA-Z]+$/);
    for (const phrase of Object.values(bank.phrases).flat()) expect(fold(phrase, true)).toMatch(/^[a-z]+( [a-z]+)*$/);
  });

  it('fit their levels', () => {
    expect(bank.words.short.every(word => word.length >= 2 && word.length <= 3)).toBe(true);
    expect(bank.words.medium.every(word => word.length >= 4 && word.length <= 5)).toBe(true);
    expect(bank.words.long.every(word => word.length >= 7)).toBe(true);
    expect(bank.words.accents.every(hasAccent)).toBe(true);
    expect(bank.words.capitals.every(word => /^[A-Z][a-z]+$/.test(fold(word, true)))).toBe(true);
    expect(bank.phrases.short.every(phrase => [3, 4].includes(phrase.split(' ').length))).toBe(true);
    expect(bank.phrases.everyday.every(phrase => phrase.split(' ').length >= 5 && phrase.split(' ').length <= 7)).toBe(true);
  });
});

describe('levels', () => {
  it('has 8 word levels and 4 phrase levels with their goals', () => {
    expect(WORD_LEVELS.map(level => level.goalWpm)).toEqual([6, 5, 5, 4, 4, 4, 3, 6]);
    expect(PHRASE_LEVELS.map(level => level.goalWpm)).toEqual([5, 6, 5, 8]);
  });

  it('draws rounds of 10 different words or 5 different phrases', () => {
    const words = drawRound(WORD_LEVELS[2], 'en', seeded(1)).items.map(item => item.text);
    expect(words).toHaveLength(ROUND_SIZE.words);
    expect(new Set(words).size).toBe(words.length);
    const phrases = drawRound(PHRASE_LEVELS[0], 'pt', seeded(2)).items;
    expect(phrases).toHaveLength(ROUND_SIZE.phrases);
  });

  it('plays the alphabet letter by letter', () => {
    const letters = drawRound(WORD_LEVELS[0], 'en', seeded(3)).items.map(item => item.text);
    expect(letters.every(letter => /^[a-z]$/.test(letter))).toBe(true);
  });

  it('counts case only for capitals', () => {
    expect(levelPool(WORD_LEVELS[6], 'en').items.every(item => item.caseSensitive)).toBe(true);
    const master = levelPool(WORD_LEVELS[7], 'pt').items;
    expect(master.some(item => item.caseSensitive)).toBe(true);
    expect(master.some(item => !item.caseSensitive)).toBe(true);
  });

  it('writes the third phrase level in the other language', () => {
    expect(levelPool(PHRASE_LEVELS[2], 'pt')).toMatchObject({lang: 'en'});
    expect(levelPool(PHRASE_LEVELS[2], 'en').items[0].text).toBe(PT.phrases.everyday[0]);
    expect(levelPool(PHRASE_LEVELS[3], 'en').items).toEqual(levelPool(PHRASE_LEVELS[1], 'en').items);
  });
});
