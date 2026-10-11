import circleCheckFilled from '@wearables-ui-toolkit/icons/svg/circlecheck__filled.svg';
import circleXFilled from '@wearables-ui-toolkit/icons/svg/circlex__filled.svg';
import {
  CornerRadius,
  IconImage,
  MaterialLibrary,
  RoundedRectangleShapeProvider,
  StaticContainer,
  TextColor,
  TextStyle,
  TextView,
  VisualState,
} from '@wearables-ui-toolkit/mrbd';
import {useMemo, type ReactNode} from 'react';
import type {Letter} from '../game/round';
import {t} from '../i18n/strings';

/** The size of a tile's letter, smaller for longer words: the letter is what the wearer writes, read at a glance. */
function letterClass(count: number): string {
  if (count <= 5) return 'uit-text-numeral2';
  if (count <= 7) return 'uit-text-heading1';
  if (count <= 9) return 'uit-text-heading2';
  return 'uit-text-body1-emphasized';
}

/**
 * One letter of the word. Right letters are filled with a check, a wrong one is
 * only outlined with a cross (the display is all green: the shapes tell them
 * apart), the next one has the focus look and the rest wait, dimmed.
 */
export function LetterTile({letter, count}: {letter: Letter; count: number}) {
  const label =
    letter.state === 'right'
      ? t('letterRight', {letter: letter.expected})
      : letter.state === 'wrong'
        ? t('letterWrong', {expected: letter.expected, read: letter.written ?? ''})
        : letter.state === 'next'
          ? t('letterNow', {letter: letter.expected})
          : t('letterNext', {letter: letter.expected});
  const text = (
    <span className={`tile-letter tile-letter--${letter.state} ${letterClass(count)}`}>
      {letter.state === 'wrong' ? letter.written : letter.expected}
    </span>
  );
  return (
    <div className={`tile tile--${letter.state}`} role="img" aria-label={label}>
      {letter.state === 'wrong' ? (
        <div className="tile-face tile-face--outlined">
          {text}
          <IconImage source={circleXFilled} className="tile-badge tile-badge--wrong" />
          <TextView textStyle={TextStyle.META3} textColor={TextColor.SECONDARY} className="tile-was">
            {t('wasLetter', {letter: letter.expected})}
          </TextView>
        </div>
      ) : (
        <TileSurface state={letter.state}>{text}</TileSurface>
      )}
    </div>
  );
}

function TileSurface({state, children}: {state: 'right' | 'next' | 'pending'; children: ReactNode}) {
  const material = useMemo(() => (state === 'right' ? MaterialLibrary.themedPrimaryBlue() : undefined), [state]);
  const shape = useMemo(() => new RoundedRectangleShapeProvider(CornerRadius.SMALL), []);
  return (
    <div className="tile-face">
      <StaticContainer
        key={state}
        material={material}
        shapeProvider={shape}
        visualState={state === 'next' ? VisualState.FOCUSED : VisualState.DEFAULT}
        width="100%"
        height="100%"
        contentClassName="tile-content">
        {children}
      </StaticContainer>
      {state === 'right' ? <IconImage source={circleCheckFilled} className="tile-badge" /> : null}
      {state === 'next' ? <span className="tile-caret" /> : null}
    </div>
  );
}
