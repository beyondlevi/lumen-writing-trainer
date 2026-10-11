import {Page, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import type {Lang} from '../content/bank';
import type {Item} from '../content/levels';
import {lettersOf, type RoundTracker} from '../game/round';
import {fold, hasAccent} from '../game/text';
import {decimal, duration, percent, t} from '../i18n/strings';
import type {Round} from '../state/useRound';
import {bandWriting, Hints, roundHints, Segments, WritingField} from './RoundParts';
import {Stat} from './Stat';

/** A phrase round: the phrase large, with the speed, time and accuracy live. */
export function PhraseRound({items, game, lang}: {items: Item[]; game: Round; lang: Lang}) {
  const {tracker} = game;
  const total = items.length;
  const index = Math.min(tracker.current(), total - 1);
  const item = items[index];
  const typed = tracker.segments[index]?.typed ?? '';
  const now = performance.now();
  const missedWords = phraseWords(item.text).filter(word => wordMissed(tracker, index, word));
  const accented = hasAccent(item.text);
  const wrongNow = lettersOf(typed, item).some(letter => letter.state === 'wrong');

  let note: string | null = null;
  if (game.paused) {
    note = t('paused');
  } else if (game.band === 'preparing') {
    note = t('preparing');
  } else if (!bandWriting(game)) {
    note = t('instructionsPhrase');
  } else {
    const notes = [
      accented ? t('accentsNote') : null,
      missedWords.length > 0 ? t('markedNote') : null,
    ].filter(text => text != null);
    note = notes.length > 0 ? notes.join(' ') : null;
  }

  return (
    <Page
      headerText={t('roundPhrases')}
      headerMetadata={t('roundMeta', {n: index + 1, total})}
      enableSystemBarInset={false}>
      <div className="page-shell">
        <div className="round-content round-content--phrase">
          <Segments
            total={total}
            done={index}
            current={index}
            label={t('roundPhraseProgress', {n: index + 1, total})}
          />
          <div className="phrase-box" data-target-phrase={item.text}>
            <PhraseText item={item} typed={typed} tracker={tracker} index={index} lang={lang} />
            <WritingField game={game} label={t('fieldLabel', {text: item.text})} />
          </div>
          <div className="round-message round-message--phrase" aria-live="polite">
            {note != null ? (
              <TextView as="p" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {note}
              </TextView>
            ) : null}
          </div>
          <div className="stat-row">
            <Stat value={decimal(tracker.liveWpm(now))} label={t('wpmNow')} />
            <Stat value={duration(tracker.activeMs(now))} label={t('time')} />
            <Stat value={percent(tracker.liveAccuracy())} label={t('accuracy')} />
          </div>
        </div>
        <Hints texts={roundHints(game, t('hintSpace'), wrongNow)} />
      </div>
    </Page>
  );
}

type PhraseWord = {text: string; from: number; to: number};

function phraseWords(text: string): PhraseWord[] {
  const words: PhraseWord[] = [];
  let from = 0;
  for (const word of text.split(' ')) {
    words.push({text: word, from, to: from + word.length});
    from += word.length + 1;
  }
  return words;
}

function wordMissed(tracker: RoundTracker, index: number, word: PhraseWord): boolean {
  for (let position = word.from; position < word.to; position += 1) {
    if (tracker.missedFirst(index, position)) {
      return true;
    }
  }
  return false;
}

/**
 * The phrase, large: what was written in full white, the rest dimmed, the
 * caret where the next letter goes, and the words that had a wrong letter
 * underlined.
 */
function PhraseText({item, typed, tracker, index, lang}: {item: Item; typed: string; tracker: RoundTracker; index: number; lang: Lang}) {
  const written = [...typed];
  const words = phraseWords(item.text);
  const expected = [...item.text];
  return (
    <p className="phrase uit-text-heading1">
      <span lang={lang}>
        {words.map((word, wordIndex) => (
          <span key={wordIndex}>
            <span className={wordMissed(tracker, index, word) ? 'phrase-word phrase-word--missed' : 'phrase-word'}>
              {expected.slice(word.from, word.to).map((character, offset) => {
                const position = word.from + offset;
                return (
                  <PhraseCharacter
                    key={position}
                    expected={character}
                    written={written[position]}
                    caret={position === written.length}
                    caseSensitive={item.caseSensitive}
                  />
                );
              })}
            </span>
            {wordIndex < words.length - 1 ? (
              <PhraseCharacter
                expected=" "
                written={written[word.to]}
                caret={word.to === written.length}
                caseSensitive={false}
              />
            ) : written.length >= expected.length ? (
              <span className="phrase-char phrase-char--caret phrase-char--end" />
            ) : null}
          </span>
        ))}
      </span>
    </p>
  );
}

function PhraseCharacter({
  expected,
  written,
  caret,
  caseSensitive,
}: {
  expected: string;
  written: string | undefined;
  caret: boolean;
  caseSensitive: boolean;
}) {
  const typed = written != null;
  const wrong = typed && fold(written, caseSensitive) !== fold(expected, caseSensitive);
  const classes = ['phrase-char', typed ? (wrong ? 'phrase-char--wrong' : 'phrase-char--typed') : 'phrase-char--pending'];
  if (caret) {
    classes.push('phrase-char--caret');
  }
  return <span className={classes.join(' ')}>{wrong ? written : expected}</span>;
}
