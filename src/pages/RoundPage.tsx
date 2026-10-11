import {useEffect, useRef, useState} from 'react';
import {Navigate, useNavigate, useParams} from 'react-router-dom';
import {DAILY_LEVEL, drawRound, levelsOf, type Level} from '../content/levels';
import {dailyWords} from '../game/daily';
import {isUnlocked} from '../game/save';
import {PhraseRound} from '../round/PhraseRound';
import {WORD_DONE_MS, WordRound} from '../round/WordRound';
import {useGame} from '../state/GameProvider';
import {useRound} from '../state/useRound';
import {RESULT_PATH} from './ResultPage';
import {trailPath} from './TrailPage';

/** The level a play path names, or null. */
function levelOfParams(mode: string | undefined, index: string | undefined): Level | null {
  if (mode === 'daily') {
    return DAILY_LEVEL;
  }
  if (mode !== 'words' && mode !== 'phrases') {
    return null;
  }
  return levelsOf(mode)[Number(index)] ?? null;
}

/** `/play/:mode/:index` and `/play/daily`: one round, then its result. */
export function RoundPage() {
  const params = useParams();
  const {save, settingKnown} = useGame();
  const level = levelOfParams(params.mode, params.index);
  if (level == null) {
    return <Navigate to="/" replace />;
  }
  if (level.index >= 0 && !isUnlocked(save, level.mode, level.index)) {
    return <Navigate to={trailPath(level.mode)} replace />;
  }
  // The words and phrases are drawn in the content language, once it is known.
  return settingKnown ? <PlayRound level={level} /> : null;
}

function PlayRound({level}: {level: Level}) {
  const navigate = useNavigate();
  const {save, contentLang, today, startRound, finishRound} = useGame();
  // One draw per opening of the page.
  const [round] = useState(() =>
    level.id === 'daily'
      ? {items: dailyWords(contentLang, save.letters, today), lang: contentLang}
      : drawRound(level, contentLang, Math.random),
  );
  useEffect(() => startRound(level), [level, startRound]);

  const leave = useRef(0);
  useEffect(() => () => window.clearTimeout(leave.current), []);
  const game = useRound({
    mode: level.mode,
    items: round.items,
    lang: round.lang,
    onDone: summary => {
      finishRound(level, summary);
      // The last word's check marks stay a moment before the result.
      leave.current = window.setTimeout(() => navigate(RESULT_PATH, {replace: true}), WORD_DONE_MS);
    },
  });

  return level.mode === 'words' ? (
    <WordRound level={level} items={round.items} game={game} />
  ) : (
    <PhraseRound items={round.items} game={game} lang={round.lang} />
  );
}
