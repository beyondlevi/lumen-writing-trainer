import circleCheckFilled from '@wearables-ui-toolkit/icons/svg/circlecheck__filled.svg';
import lockFilled from '@wearables-ui-toolkit/icons/svg/lock__filled.svg';
import pencilFilled from '@wearables-ui-toolkit/icons/svg/pencil__filled.svg';
import {
  ActionHint,
  Button,
  MaterialLibrary,
  Page,
  ScrollView,
  TextColor,
  TextStyle,
  TextView,
} from '@wearables-ui-toolkit/mrbd';
import {memo, useCallback, useMemo, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Stars} from '../components/Stars';
import {KeptPage, useKeptView, useMountedOnce} from '../components/KeptPage';
import {levelsOf, type Mode} from '../content/levels';
import {currentLevel, isUnlocked} from '../game/save';
import {t} from '../i18n/strings';
import {useGame} from '../state/GameProvider';
import {levelTitle} from './levelTitle';

export function trailPath(mode: Mode): string {
  return `/trail/${mode}`;
}

export function playPath(mode: Mode, index: number): string {
  return `/play/${mode}/${index}`;
}

type Step = {
  title: string;
  stars: number;
  state: 'done' | 'open' | 'locked';
};

/**
 * A mode's trail of levels, kept mounted above the routes like Home: Back from
 * a round or its result only brings it back, with the focus on the level
 * that was played.
 */
export function Trail({mode}: {mode: Mode}) {
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const {save, contentLang, lastPlayed} = useGame();
  const shown = pathname === trailPath(mode);
  const mounted = useMountedOnce(shown);

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const play = useCallback((index: number) => navigateRef.current(playPath(mode, index)), [mode]);

  const current = currentLevel(save, mode);
  const steps: Step[] = levelsOf(mode).map((level, index) => {
    const stars = save.best[mode][index]?.stars ?? 0;
    return {
      title: levelTitle(level, contentLang),
      stars,
      state: !isUnlocked(save, mode, index) ? 'locked' : stars > 0 ? 'done' : 'open',
    };
  });
  const view = useKeptView(shown, () => (
    <TrailView
      mode={mode}
      current={current}
      stepsKey={JSON.stringify(steps)}
      steps={steps}
      onPlay={play}
    />
  ));

  const layerRef = useRef<HTMLDivElement>(null);
  const focusTarget = lastPlayed[mode] ?? current;
  const focusTargetRef = useRef(focusTarget);
  focusTargetRef.current = focusTarget;
  const focusLevel = useCallback(() => {
    layerRef.current?.querySelector<HTMLElement>(`[data-level="${focusTargetRef.current}"]`)?.focus();
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <KeptPage ref={layerRef} shown={shown} onLive={focusLevel}>
      {view}
    </KeptPage>
  );
}

type TrailViewProps = {
  mode: Mode;
  current: number;
  /** Changes whenever a step does (the view is drawn again only then). */
  stepsKey: string;
  steps: Step[];
  onPlay(index: number): void;
};

const TrailView = memo(
  function TrailView({mode, current, steps, onPlay}: TrailViewProps) {
    const [focused, setFocused] = useState<number | null>(null);
    return (
      <Page
        headerText={mode === 'words' ? t('trailWords') : t('trailPhrases')}
        headerMetadata={t('trailMeta', {n: current + 1, total: steps.length})}
        enableSystemBarInset={false}>
        <div className="page-shell">
          <ScrollView insetForHeader ariaLabel={t('trailLabel')}>
            <div className="trail-inset">
            <ol className="trail">
              {steps.map((step, index) => (
                <TrailStep
                  key={index}
                  index={index}
                  step={step}
                  focused={focused === index}
                  onFocusStep={setFocused}
                  onPlay={onPlay}
                />
              ))}
            </ol>
            </div>
          </ScrollView>
          <div className="hint-dock">
            <ActionHint text={t('hintChoose')} />
            <ActionHint text={t('trailPlay')} />
          </div>
        </div>
      </Page>
    );
  },
  (previous, next) =>
    previous.mode === next.mode &&
    previous.current === next.current &&
    previous.stepsKey === next.stepsKey &&
    previous.onPlay === next.onPlay,
);

function TrailStep({
  index,
  step,
  focused,
  onFocusStep,
  onPlay,
}: {
  index: number;
  step: Step;
  focused: boolean;
  onFocusStep(index: number | null): void;
  onPlay(index: number): void;
}) {
  const doneMaterial = useMemo(() => (step.state === 'done' ? MaterialLibrary.themedPrimaryBlue() : undefined), [step.state]);
  const locked = step.state === 'locked';
  const label = locked
    ? t('trailLockedLabel', {title: step.title})
    : t('trailLevelLabel', {title: step.title, stars: step.stars > 0 ? t('starsOf', {n: step.stars}) : t('trailNew')});
  const playStep = () => {
    if (!locked) {
      onPlay(index);
    }
  };
  return (
    <li
      className={index % 2 === 0 ? 'trail-step' : 'trail-step trail-step--shifted'}
      onFocus={() => onFocusStep(index)}
      onBlur={() => onFocusStep(null)}>
      <div className="trail-step-node">
        <Button
          key={step.state}
          icon={step.state === 'done' ? circleCheckFilled : locked ? lockFilled : pencilFilled}
          material={doneMaterial}
          ariaLabel={label}
          data-level={index}
          onClick={playStep}
        />
      </div>
      <div className="trail-step-text">
        <TextView
          textStyle={focused ? TextStyle.LABEL_EMPHASIZED : TextStyle.LABEL}
          textColor={locked ? TextColor.SECONDARY : TextColor.PRIMARY}>
          {step.title}
        </TextView>
        {focused ? (
          <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
            {locked ? t('trailLocked') : t('trailPlay')}
          </TextView>
        ) : step.stars > 0 ? (
          <Stars count={step.stars} />
        ) : null}
      </div>
    </li>
  );
}
