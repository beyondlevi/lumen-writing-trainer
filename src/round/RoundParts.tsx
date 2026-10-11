import {ActionHint, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import type {Level} from '../content/levels';
import {t} from '../i18n/strings';
import type {Round} from '../state/useRound';

export function headerText(level: Level): string {
  if (level.id === 'daily') {
    return t('roundDaily');
  }
  return level.mode === 'words' ? t('roundWords') : t('roundPhrases');
}

/** The thin progress bar of a round: one segment per word or phrase. */
export function Segments({total, done, current, label}: {total: number; done: number; current: number; label: string}) {
  return (
    <div className="round-segments" role="img" aria-label={label}>
      {Array.from({length: total}, (_, index) => (
        <span
          key={index}
          className={
            index < done ? 'segment segment--done' : index === current ? 'segment segment--current' : 'segment'
          }
        />
      ))}
    </div>
  );
}

export function Hints({texts}: {texts: string[]}) {
  return (
    <div className="hint-dock">
      {texts.map(text => (
        <ActionHint key={text} text={text} />
      ))}
    </div>
  );
}

/** Whether the band is writing now (without Lumen's writing API: once the first letter came). */
export function bandWriting(game: Round): boolean {
  return game.band === 'writing' || (game.band === 'none' && game.started);
}

/** The hints under a round, for what the band can do now. */
export function roundHints(game: Round, writingHint: string, wrong: boolean): string[] {
  if (game.paused) {
    return [t('hintContinue'), t('hintLeaveRound')];
  }
  if (!bandWriting(game)) {
    return [t('hintWrite'), t('hintLeave')];
  }
  return [wrong ? t('hintErase') : writingHint, t('hintStop')];
}

/** The real text field the band writes into. It covers what it writes over, and only the app's own focus look shows. */
export function WritingField({game, label}: {game: Round; label: string}) {
  return (
    <input
      ref={game.fieldRef}
      className="round-field uit-text-body2"
      type="text"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      enterKeyHint="next"
      aria-label={label}
      defaultValue=""
      onInput={game.onInput}
      onKeyDown={game.onKeyDown}
    />
  );
}

export function RoundNote({text}: {text: string}) {
  return (
    <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY} className="round-note">
      {text}
    </TextView>
  );
}
