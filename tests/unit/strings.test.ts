import {describe, expect, it} from 'vitest';
import {catalogs, langOf} from '../../src/i18n/strings';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

describe('i18n catalog', () => {
  it('has every English string in Portuguese, with the same placeholders', () => {
    expect(Object.keys(catalogs.pt).sort()).toEqual(Object.keys(catalogs.en).sort());
    for (const [key, text] of Object.entries(catalogs.en)) {
      expect(placeholders(catalogs.pt[key as keyof typeof catalogs.pt]), key).toEqual(placeholders(text));
    }
  });

  it('chooses Portuguese for pt-*, English otherwise', () => {
    expect(['pt', 'pt-BR', 'pt-PT', 'en-US', 'es', undefined].map(langOf)).toEqual(['pt', 'pt', 'pt', 'en', 'en', 'en']);
  });
});
