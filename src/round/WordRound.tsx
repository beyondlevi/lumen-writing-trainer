import flameFilled from '@wearables-ui-toolkit/icons/svg/flame__filled.svg';
import starFilled from '@wearables-ui-toolkit/icons/svg/star__filled.svg';
import {Chip, Page, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useEffect, useState, type ReactNode} from 'react';
import type {Item, Level} from '../content/levels';
import {lettersOf} from '../game/round';
import {t} from '../i18n/strings';
import type {Round} from '../state/useRound';
import {LetterTile} from './LetterTile';
import {bandWriting, headerText, Hints, RoundNote, roundHints, Segments, WritingField} from './RoundParts';

/** How long a finished word stays on screen before the next one shows (unless the wearer goes on). */
export const WORD_DONE_MS = 700;

/** A word round: the word's letters as tiles, right, wrong, next or waiting. */
export function WordRound({level, items, game}: {level: Level; items: Item[]; game: Round}) {
  const {tracker} = game;
  const total = items.length;
  const writingIndex = Math.min(tracker.current(), total - 1);
  const complete = tracker.complete(writingIndex) && !tracker.segments[writingIndex]?.ended;

  // A finished word shows its check marks for a moment, then the next word (or at once with a space).
  const [shownNext, setShownNext] = useState<number | null>(null);
  useEffect(() => {
    if (!complete || tracker.done) {
      return;
    }
    const timer = window.setTimeout(() => setShownNext(writingIndex), WORD_DONE_MS);
    return () => window.clearTimeout(timer);
  }, [complete, tracker.done, writingIndex]);
  const index = complete && shownNext === writingIndex && writingIndex + 1 < total ? writingIndex + 1 : writingIndex;
  const finishedWord = complete && index === writingIndex;

  const item = items[index];
  const typed = tracker.segments[index]?.typed ?? '';
  const letters = lettersOf(typed, item);
  const wrong = letters.find(letter => letter.state === 'wrong') ?? null;
  const settled = finishedWord ? tracker.settled.find(entry => entry.target === index) ?? null : null;

  let message: ReactNode = null;
  if (game.paused) {
    message = <RoundNote text={t('paused')} />;
  } else if (game.band === 'preparing') {
    message = <RoundNote text={t('preparing')} />;
  } else if (settled != null) {
    const next = items[index + 1];
    const detail = [
      settled.clean ? t('wordClean') : settled.errors === 1 ? t('wordError') : t('wordErrors', {n: settled.errors}),
      t('wordCombo', {n: settled.combo}),
    ].join(' · ');
    message = (
      <div className="word-done">
        <p className="word-done-points uit-text-heading1">{t('wordPoints', {n: settled.points})}</p>
        <p className="word-done-detail">
          <TextView as="span" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
            {next != null ? `${detail} · ${t('wordNext', {word: ''})}` : detail}
          </TextView>
          {next != null ? (
            <TextView as="span" textStyle={TextStyle.META2}>
              {next.text}
            </TextView>
          ) : null}
        </p>
      </div>
    );
  } else if (wrong != null) {
    message = <RoundNote text={t('wrongLetter', {read: wrong.written ?? '', expected: wrong.expected})} />;
  } else if (!bandWriting(game)) {
    message = <RoundNote text={level.id === 'capitals' ? t('instructionsCapitals') : t('instructions')} />;
  }

  const hints = finishedWord && !game.paused ? [t('hintNext'), t('hintStop')] : roundHints(game, t('hintNext'), wrong != null);
  const [before, after] = t('writePrompt', {word: '\u0000'}).split('\u0000');
  return (
    <Page headerText={headerText(level)} headerMetadata={t('roundMeta', {n: index + 1, total})} enableSystemBarInset={false}>
      <div className="page-shell">
        <div className="round-content">
          <Segments
            total={total}
            done={index}
            current={index}
            label={t('roundProgress', {n: index + 1, total})}
          />
          <div className="chip-row">
            <Chip icon={flameFilled} text={t('combo', {n: tracker.combo})} />
            <Chip icon={starFilled} text={t('points', {n: tracker.points})} />
          </div>
          <p className="round-prompt" data-target-word={item.text}>
            <TextView as="span" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {before}
            </TextView>
            <TextView as="span" textStyle={TextStyle.META2_EMPHASIZED}>
              {item.text}
            </TextView>
            {after ? (
              <TextView as="span" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {after}
              </TextView>
            ) : null}
          </p>
          <div className="tiles">
            {letters.map((letter, position) => (
              <LetterTile key={`${index}:${position}`} letter={letter} count={letters.length} />
            ))}
            <WritingField game={game} label={t('fieldLabel', {text: item.text})} />
          </div>
          <div className="round-message" aria-live="polite">
            {message}
          </div>
        </div>
        <Hints texts={hints} />
      </div>
    </Page>
  );
}
