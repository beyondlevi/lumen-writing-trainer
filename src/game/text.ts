// How written text is compared with the expected text. The band has no accented
// letters ("não" is written "nao"), so letters compare without accents, and
// without case unless a level asks for capitals.

/** `text` without accents (NFD, combining marks removed), lowercased unless `keepCase`. */
export function fold(text: string, keepCase = false): string {
  const bare = text.normalize('NFD').replace(/\p{M}/gu, '');
  return keepCase ? bare : bare.toLowerCase();
}

/** Whether the written character counts as the expected one. */
export function sameLetter(written: string, expected: string, keepCase = false): boolean {
  return fold(written, keepCase) === fold(expected, keepCase);
}

/** The a–z letter a character stands for (accents and case removed), or null. */
export function letterKey(character: string): string | null {
  const key = fold(character);
  return /^[a-z]$/.test(key) ? key : null;
}

/** Whether `text` carries an accent (or ç, ñ…) that the band can't write. */
export function hasAccent(text: string): boolean {
  return fold(text, true) !== text;
}
