import {describe, expect, it} from 'vitest';
import type {Item} from '../../src/content/levels';
import {lettersOf, RoundTracker, splitPhrases, splitWords, worstLetters} from '../../src/game/round';

const items = (...texts: string[]): Item[] => texts.map(text => ({text, caseSensitive: false}));

/** Types `text` one character at a time, `stepMs` apart, starting at `start`. */
function typeInto(round: RoundTracker, before: string, text: string, start: number, stepMs = 1000): string {
  let value = before;
  let now = start;
  for (const character of text) {
    value = character === '\b' ? value.slice(0, -1) : value + character;
    round.update(value, now);
    now += stepMs;
  }
  return value;
}

describe('splitting a word round', () => {
  const words = items('casa', 'livro', 'sol');

  it('takes the current word from the number of spaces written', () => {
    expect(splitWords('cas', words)).toEqual([{typed: 'cas', ended: false}]);
    expect(splitWords('casa ', words)).toEqual([{typed: 'casa', ended: true}]);
    expect(splitWords('casa li', words)).toEqual([
      {typed: 'casa', ended: true},
      {typed: 'li', ended: false},
    ]);
  });

  it('counts repeated or leading spaces once', () => {
    expect(splitWords(' casa   li', words).map(segment => segment.typed)).toEqual(['casa', 'li']);
  });

  it('ends a word with a space even when it is short', () => {
    expect(splitWords('ca l', words)).toEqual([
      {typed: 'ca', ended: true},
      {typed: 'l', ended: false},
    ]);
  });

  it('goes on to the next word when one grows past its length', () => {
    expect(splitWords('casali', words)).toEqual([
      {typed: 'casa', ended: true},
      {typed: 'li', ended: false},
    ]);
  });

  it('ignores what comes after the last word', () => {
    expect(splitWords('casa livro sol extra', words)).toHaveLength(3);
  });
});

describe('splitting a phrase round', () => {
  const phrases = items('o sol', 'bom dia');

  it('ends a phrase written exactly, with or without a space after', () => {
    expect(splitPhrases('o sol', phrases)).toEqual([{typed: 'o sol', ended: true}]);
    expect(splitPhrases('o sol bo', phrases)).toEqual([
      {typed: 'o sol', ended: true},
      {typed: 'bo', ended: false},
    ]);
  });

  it('ends a phrase that reached its length when a space follows', () => {
    expect(splitPhrases('o sal', phrases)).toEqual([{typed: 'o sal', ended: false}]);
    expect(splitPhrases('o sal b', phrases)).toEqual([
      {typed: 'o sal', ended: true},
      {typed: 'b', ended: false},
    ]);
  });

  it('keeps the spaces inside a phrase', () => {
    expect(splitPhrases('o s', phrases)).toEqual([{typed: 'o s', ended: false}]);
  });
});

describe('letters of a word', () => {
  it('marks right, wrong, next and pending letters', () => {
    expect(lettersOf('cal', items('casa')[0]).map(letter => letter.state)).toEqual(['right', 'right', 'wrong', 'next']);
    expect(lettersOf('', items('sol')[0]).map(letter => letter.state)).toEqual(['next', 'pending', 'pending']);
  });

  it('compares without accents', () => {
    expect(lettersOf('nao', items('não')[0]).every(letter => letter.state === 'right')).toBe(true);
  });
});

describe('a word round', () => {
  it('counts a letter right only when it came out right the first time', () => {
    const round = new RoundTracker('words', items('casa'));
    typeInto(round, '', 'cal\bsa', 0);
    expect(round.done).toBe(true);
    const summary = round.summary();
    expect(summary.accuracy).toBe(3 / 4);
    expect(summary.letters.s).toEqual({attempts: 1, hits: 0});
    expect(summary.letters.a).toEqual({attempts: 2, hits: 2});
    expect(summary.worst).toEqual(['s']);
  });

  it('scores clean words with the combo and breaks it on an error', () => {
    const round = new RoundTracker('words', items('ab', 'cd', 'ef', 'gh'));
    typeInto(round, '', 'ab cd ex\bf gh', 0);
    expect(round.settled.map(entry => entry.points)).toEqual([15, 30, 10, 15]);
    expect(round.settled.map(entry => entry.combo)).toEqual([2, 3, 1, 2]);
    expect(round.maxCombo).toBe(3);
    expect(round.points).toBe(70);
  });

  it('counts missing letters as errors when a space ends a word early', () => {
    const round = new RoundTracker('words', items('casa', 'sol'));
    typeInto(round, '', 'ca sol', 0);
    expect(round.done).toBe(true);
    expect(round.settled[0]).toMatchObject({clean: false, errors: 2});
    expect(round.summary().accuracy).toBe(5 / 7);
  });

  it('ends on the last letter of the last word when it is right', () => {
    const round = new RoundTracker('words', items('ab', 'cd'));
    typeInto(round, '', 'ab c', 0);
    expect(round.done).toBe(false);
    typeInto(round, 'ab c', 'd', 10000);
    expect(round.done).toBe(true);
  });

  it('measures speed from the first letter to the last, pauses excluded', () => {
    const round = new RoundTracker('words', items('abcd', 'efgh'));
    let value = typeInto(round, '', 'abcd ', 0, 1000); // letters at 0..4000
    round.pause(5000);
    round.resume(65000);
    value = typeInto(round, value, 'efgh', 65000, 1000); // last letter at 68000
    expect(value).toBe('abcd efgh');
    const summary = round.summary();
    expect(summary.ms).toBe(8000);
    expect(summary.characters).toBe(9);
    expect(summary.wpm).toBeCloseTo(9 / 5 / (8000 / 60000));
  });

  it('says what is still to be written, for Lumen', () => {
    const round = new RoundTracker('words', items('casa', 'livro', 'sol'));
    expect(round.remainingText()).toBe('casa livro sol');
    typeInto(round, '', 'ca', 0);
    expect(round.remainingText()).toBe('sa livro sol');
    typeInto(round, 'ca', 'sa ', 2000);
    expect(round.remainingText()).toBe('livro sol');
  });
});

describe('a phrase round', () => {
  it('scores each word of a phrase and finishes on the last phrase', () => {
    const round = new RoundTracker('phrases', items('o sol', 'bom dia'));
    let value = typeInto(round, '', 'o sxl', 0);
    expect(round.done).toBe(false);
    value = typeInto(round, value, ' bom dia', 5000);
    expect(round.done).toBe(true);
    expect(round.settled.map(entry => entry.clean)).toEqual([true, false, true, true]);
    expect(round.summary().accuracy).toBe(9 / 10);
    expect(value).toBe('o sxl bom dia');
  });

  it('measures accuracy live', () => {
    const round = new RoundTracker('phrases', items('bom dia'));
    typeInto(round, '', 'bxm', 0);
    expect(round.liveAccuracy()).toBeCloseTo(2 / 3);
    expect(round.missedFirst(0, 1)).toBe(true);
  });

  it('starts the next phrase after the space that follows', () => {
    const round = new RoundTracker('phrases', items('o sol', 'bom dia'));
    typeInto(round, '', 'o sol ', 0);
    expect(round.current()).toBe(1);
    expect(round.remainingText()).toBe('bom dia');
  });
});

describe('worst letters', () => {
  it('lists up to three letters with misses, the highest share first', () => {
    expect(
      worstLetters({
        a: {attempts: 10, hits: 9},
        l: {attempts: 4, hits: 1},
        s: {attempts: 2, hits: 1},
        v: {attempts: 3, hits: 2},
        e: {attempts: 5, hits: 5},
      }),
    ).toEqual(['l', 's', 'v']);
  });
});
