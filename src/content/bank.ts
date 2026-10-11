/** Languages of the words and phrases (and of the interface). */
export type Lang = 'en' | 'pt';

/** Word levels whose lists are written out; the alphabet and the master mix are derived. */
export type WordList = 'short' | 'medium' | 'similar' | 'accents' | 'long' | 'capitals';

/** Phrase lists; the other levels reuse them. */
export type PhraseList = 'short' | 'everyday';

/** Everything a language brings to the game. */
export type Bank = {
  words: Record<WordList, readonly string[]>;
  phrases: Record<PhraseList, readonly string[]>;
};
