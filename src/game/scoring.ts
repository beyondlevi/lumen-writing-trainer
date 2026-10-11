// Points, combo, stars, speed and experience: the rules of the game.

export const MAX_COMBO = 5;
export const WORD_POINTS = 10;
export const CLEAN_BONUS = 5;
export const DAILY_BONUS_XP = 50;

/** Points for one word: 10, plus 5 without an error, times the combo it was written with (an error breaks it: x1). */
export function wordPoints(clean: boolean, combo: number): number {
  return clean ? (WORD_POINTS + CLEAN_BONUS) * combo : WORD_POINTS;
}

/** The combo after a word: up by one (to x5) without an error, back to x1 with one. */
export function nextCombo(combo: number, clean: boolean): number {
  return clean ? Math.min(MAX_COMBO, combo + 1) : 1;
}

/** Words per minute: characters written ÷ 5 ÷ minutes. */
export function wordsPerMinute(characters: number, milliseconds: number): number {
  if (characters <= 0 || milliseconds <= 0) {
    return 0;
  }
  return characters / 5 / (milliseconds / 60000);
}

/** Stars for a finished round: ★ done, ★★ with 90% accuracy, ★★★ with 97% and the level's speed. */
export function starsFor(accuracy: number, wpm: number, goalWpm: number): 1 | 2 | 3 {
  if (accuracy >= 0.97 && wpm >= goalWpm) {
    return 3;
  }
  return accuracy >= 0.9 ? 2 : 1;
}

/** Stars the previous level needs for the next one to open. */
export const STARS_TO_UNLOCK = 2;

/** Total experience that completes level `n` (100, 300, 600…): 100·n·(n+1)/2. */
export function xpForLevel(n: number): number {
  return (100 * n * (n + 1)) / 2;
}

export type XpLevel = {
  /** The wearer's level, from 1. */
  level: number;
  /** Experience gained within this level. */
  into: number;
  /** Experience this level spans. */
  span: number;
  /** Experience still missing for the next level. */
  missing: number;
};

/** The level reached with `xp` in total: level n is done at 100·n·(n+1)/2. */
export function levelForXp(xp: number): XpLevel {
  const total = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level) <= total) {
    level += 1;
  }
  const floor = xpForLevel(level - 1);
  const span = xpForLevel(level) - floor;
  return {level, into: total - floor, span, missing: span - (total - floor)};
}
