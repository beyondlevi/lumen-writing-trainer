// The daily challenge: ten words from the bank, chosen for the letters the band
// misses most with this wearer (Progress). The same day draws the same words.
import type {Lang} from '../content/bank';
import {bankOf, plainWords, ROUND_SIZE, type Item} from '../content/levels';
import {draw, drawWeighted, hashSeed, seeded} from './random';
import type {LetterTally} from './round';
import {letterKey} from './text';

/** How many of the worst letters weigh the draw. */
const WORST_LETTERS = 5;

/** Letters with misses, worst share first, with that share. */
export function weakLetters(letters: LetterTally): {letter: string; missRate: number}[] {
  return Object.entries(letters)
    .filter(([, tally]) => tally.attempts > 0 && tally.hits < tally.attempts)
    .map(([letter, tally]) => ({letter, missRate: 1 - tally.hits / tally.attempts}))
    .sort((a, b) => b.missRate - a.missRate || a.letter.localeCompare(b.letter))
    .slice(0, WORST_LETTERS);
}

/** The daily challenge's words for `day`. Without misses yet, words with the band's look-alike letters. */
export function dailyWords(lang: Lang, letters: LetterTally, day: string): Item[] {
  const random = seeded(hashSeed(`${day}:${lang}`));
  const weak = weakLetters(letters);
  if (weak.length === 0) {
    return draw(
      bankOf(lang).words.similar.map(text => ({text, caseSensitive: false})),
      ROUND_SIZE.words,
      random,
    );
  }
  const rate = new Map(weak.map(entry => [entry.letter, entry.missRate]));
  const weight = (item: Item) => {
    let sum = 0;
    for (const character of item.text) {
      sum += rate.get(letterKey(character) ?? '') ?? 0;
    }
    return sum;
  };
  const candidates = plainWords(lang).filter(item => weight(item) > 0);
  const pool = candidates.length >= ROUND_SIZE.words ? candidates : plainWords(lang);
  return drawWeighted(pool, item => 0.05 + weight(item), ROUND_SIZE.words, random);
}
