import {draw, type Random} from '../game/random';
import type {Bank, Lang} from './bank';
import {EN} from './wordsEn';
import {PT} from './wordsPt';

export type Mode = 'words' | 'phrases';

/** One thing to write: a word (or letter) in a word round, a phrase in a phrase round. */
export type Item = {
  text: string;
  /** Whether capitals count (the Capitals level): otherwise case is ignored. */
  caseSensitive: boolean;
};

export type LevelId =
  | 'alphabet'
  | 'short'
  | 'medium'
  | 'similar'
  | 'accents'
  | 'long'
  | 'capitals'
  | 'master'
  | 'phrasesShort'
  | 'phrasesEveryday'
  | 'phrasesOther'
  | 'phrasesFast'
  | 'daily';

export type Level = {
  mode: Mode;
  /** Position on the mode's trail, from 0 (-1 for the daily challenge). */
  index: number;
  id: LevelId;
  /** Words per minute that, with 97% accuracy, give three stars. */
  goalWpm: number;
};

export const WORD_LEVELS: readonly Level[] = (
  [
    ['alphabet', 6],
    ['short', 5],
    ['medium', 5],
    ['similar', 4],
    ['accents', 4],
    ['long', 4],
    ['capitals', 3],
    ['master', 6],
  ] as const
).map(([id, goalWpm], index) => ({mode: 'words', index, id, goalWpm}));

export const PHRASE_LEVELS: readonly Level[] = (
  [
    ['phrasesShort', 5],
    ['phrasesEveryday', 6],
    ['phrasesOther', 5],
    ['phrasesFast', 8],
  ] as const
).map(([id, goalWpm], index) => ({mode: 'phrases', index, id, goalWpm}));

/** The daily challenge: ten words from the bank, played as a word round. */
export const DAILY_LEVEL: Level = {mode: 'words', index: -1, id: 'daily', goalWpm: 5};

/** Items in one round. */
export const ROUND_SIZE: Record<Mode, number> = {words: 10, phrases: 5};

export function levelsOf(mode: Mode): readonly Level[] {
  return mode === 'words' ? WORD_LEVELS : PHRASE_LEVELS;
}

export function bankOf(lang: Lang): Bank {
  return lang === 'pt' ? PT : EN;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'pt' ? 'en' : 'pt';
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

const plain = (texts: readonly string[]): Item[] => texts.map(text => ({text, caseSensitive: false}));

/** Words of every written word level but the capitals: the daily challenge's bank. */
export function plainWords(lang: Lang): Item[] {
  const {words} = bankOf(lang);
  return plain([...words.short, ...words.medium, ...words.similar, ...words.accents, ...words.long]);
}

/** What a level draws its rounds from, and the language it is written in. */
export function levelPool(level: Level, lang: Lang): {items: Item[]; lang: Lang} {
  const bank = bankOf(lang);
  switch (level.id) {
    case 'alphabet':
      return {items: plain(ALPHABET), lang};
    case 'short':
    case 'medium':
    case 'similar':
    case 'accents':
    case 'long':
      return {items: plain(bank.words[level.id]), lang};
    case 'capitals':
      return {items: bank.words.capitals.map(text => ({text, caseSensitive: true})), lang};
    case 'master':
      return {
        items: [...plainWords(lang), ...bank.words.capitals.map(text => ({text, caseSensitive: true}))],
        lang,
      };
    case 'phrasesShort':
      return {items: plain(bank.phrases.short), lang};
    case 'phrasesEveryday':
    case 'phrasesFast':
      return {items: plain(bank.phrases.everyday), lang};
    case 'phrasesOther':
      return {items: plain(bankOf(otherLang(lang)).phrases.everyday), lang: otherLang(lang)};
    case 'daily':
      return {items: plainWords(lang), lang};
  }
}

/** A round of a level: its items drawn without repeats. */
export function drawRound(level: Level, lang: Lang, random: Random): {items: Item[]; lang: Lang} {
  const pool = levelPool(level, lang);
  return {items: draw(pool.items, ROUND_SIZE[level.mode], random), lang: pool.lang};
}
