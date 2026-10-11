import {describe, expect, it} from 'vitest';
import {fold, hasAccent, letterKey, sameLetter} from '../../src/game/text';

describe('comparing without accents', () => {
  it('drops accents, cedilla and tilde, and case', () => {
    expect(fold('Não você café AÇÃO')).toBe('nao voce cafe acao');
    expect(fold('São Paulo', true)).toBe('Sao Paulo');
  });

  it('matches a written letter against an accented one', () => {
    expect(sameLetter('a', 'ã')).toBe(true);
    expect(sameLetter('c', 'ç')).toBe(true);
    expect(sameLetter('E', 'é')).toBe(true);
    expect(sameLetter('l', 'i')).toBe(false);
  });

  it('keeps case when the level asks for capitals', () => {
    expect(sameLetter('m', 'M', true)).toBe(false);
    expect(sameLetter('M', 'M', true)).toBe(true);
    expect(sameLetter('A', 'Á', true)).toBe(true);
  });

  it('names the a–z letter of a character', () => {
    expect(letterKey('Ç')).toBe('c');
    expect(letterKey('ñ')).toBe('n');
    expect(letterKey(' ')).toBeNull();
    expect(letterKey('#')).toBeNull();
  });

  it('tells accented words', () => {
    expect(hasAccent('está')).toBe(true);
    expect(hasAccent('esta')).toBe(false);
  });
});
