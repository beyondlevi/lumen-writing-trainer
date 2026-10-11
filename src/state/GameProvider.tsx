import {createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {Lang} from '../content/bank';
import type {Level, Mode} from '../content/levels';
import {dayKey} from '../game/dates';
import type {RoundSummary} from '../game/round';
import {applyRound, loadSave, storeSave, type Save, type Stars} from '../game/save';
import {levelForXp} from '../game/scoring';
import {locale} from '../i18n/strings';
import {resolveContentLang, watchContentSetting, type ContentSetting} from '../lumen/config';

/** A finished round, as the result screen shows it. */
export type RoundResult = {
  level: Level;
  summary: RoundSummary;
  stars: Stars;
  xp: number;
  record: boolean;
  unlocked: number | null;
  /** The wearer's level and progress within it after the round. */
  xpLevel: ReturnType<typeof levelForXp>;
};

type Game = {
  save: Save;
  /** The language of the words and phrases. */
  contentLang: Lang;
  /** Whether the "Content language" setting has been read (a round waits for it). */
  settingKnown: boolean;
  /** Today, local date ("YYYY-MM-DD"). */
  today: string;
  /** The trail level each mode last played (its trail focuses it on Back). */
  lastPlayed: Record<Mode, number | null>;
  result: RoundResult | null;
  startRound(level: Level): void;
  finishRound(level: Level, summary: RoundSummary): RoundResult;
};

const GameContext = createContext<Game | null>(null);

export function GameProvider({children}: {children: ReactNode}) {
  const [save, setSave] = useState<Save>(() => loadSave(window.localStorage));
  const saveRef = useRef(save);
  saveRef.current = save;
  const [setting, setSetting] = useState<ContentSetting | null>(null);
  const [today, setToday] = useState(() => dayKey());
  const [lastPlayed, setLastPlayed] = useState<Record<Mode, number | null>>({words: null, phrases: null});
  const [result, setResult] = useState<RoundResult | null>(null);

  useEffect(() => watchContentSetting(setSetting), []);

  // The page sleeps with the display; the date may have changed when it wakes.
  useEffect(() => {
    const refresh = () => setToday(dayKey());
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const startRound = useCallback((level: Level) => {
    if (level.index >= 0) {
      setLastPlayed(previous => (previous[level.mode] === level.index ? previous : {...previous, [level.mode]: level.index}));
    }
  }, []);

  const finishRound = useCallback((level: Level, summary: RoundSummary) => {
    const day = dayKey();
    const outcome = applyRound(saveRef.current, level, summary, day);
    saveRef.current = outcome.save;
    storeSave(window.localStorage, outcome.save);
    const finished: RoundResult = {
      level,
      summary,
      stars: outcome.stars,
      xp: outcome.xp,
      record: outcome.record,
      unlocked: outcome.unlocked,
      xpLevel: levelForXp(outcome.save.xp),
    };
    setSave(outcome.save);
    setToday(day);
    setResult(finished);
    return finished;
  }, []);

  const contentLang = resolveContentLang(setting ?? 'auto', locale);
  const settingKnown = setting != null;
  const game = useMemo(
    () => ({save, contentLang, settingKnown, today, lastPlayed, result, startRound, finishRound}),
    [save, contentLang, settingKnown, today, lastPlayed, result, startRound, finishRound],
  );
  return <GameContext value={game}>{children}</GameContext>;
}

export function useGame(): Game {
  const game = use(GameContext);
  if (game == null) {
    throw new Error('useGame outside GameProvider');
  }
  return game;
}
