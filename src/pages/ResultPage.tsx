import mediaSkipForwardFilled from '@wearables-ui-toolkit/icons/svg/mediaskipforward__filled.svg';
import rotateCounterClockwiseFilled from '@wearables-ui-toolkit/icons/svg/rotatecounterclockwise__filled.svg';
import {
  Button,
  ButtonGroup,
  MaterialLibrary,
  Page,
  ProgressIndicator,
  Tag,
  TextColor,
  TextStyle,
  TextView,
  Toast,
} from '@wearables-ui-toolkit/mrbd';
import {useEffect, useMemo} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';
import {Stars} from '../components/Stars';
import {Stat} from '../round/Stat';
import {levelsOf} from '../content/levels';
import {currentLevel, isUnlocked} from '../game/save';
import {decimal, duration, percent, t} from '../i18n/strings';
import {useGame, type RoundResult} from '../state/GameProvider';
import {levelTitle} from './levelTitle';
import {playPath} from './TrailPage';

export const RESULT_PATH = '/result';

/** The end of a round: stars, speed, accuracy, time, combo, experience and the letters to train. */
export function ResultPage() {
  const {result} = useGame();
  if (result == null) {
    return <Navigate to="/" replace />;
  }
  return <ResultView result={result} />;
}

function ResultView({result}: {result: RoundResult}) {
  const navigate = useNavigate();
  const {save, contentLang} = useGame();
  const {level, summary, xpLevel} = result;
  const nextMaterial = useMemo(() => MaterialLibrary.themedPrimaryBlue(), []);

  useEffect(() => {
    if (result.unlocked != null) {
      Toast.show(t('unlockedToast', {title: levelTitle(levelsOf(level.mode)[result.unlocked], contentLang)}));
    }
  }, [contentLang, level.mode, result.unlocked]);

  const repeatPath = level.id === 'daily' ? '/play/daily' : playPath(level.mode, level.index);
  const nextIndex =
    level.index < 0
      ? currentLevel(save, 'words')
      : level.index + 1 < levelsOf(level.mode).length && isUnlocked(save, level.mode, level.index + 1)
        ? level.index + 1
        : level.index;
  const nextPath = playPath(level.index < 0 ? 'words' : level.mode, nextIndex);

  return (
    <Page headerText={t('resultHeader')} enableSystemBarInset={false}>
      <div className="page-shell">
        <div className="result-content">
          <Stars count={result.stars} large />
          <div className="result-stats" role="group" aria-label={t('resultStats')}>
            <Stat value={t('wpm', {wpm: decimal(summary.wpm)})} label={result.record ? t('speedRecord') : t('speed')} />
            <Stat value={percent(summary.accuracy)} label={t('accuracy')} />
            <Stat value={duration(summary.ms)} label={t('time')} />
            <Stat value={`x${summary.maxCombo}`} label={t('maxCombo')} />
          </div>
          <div className="result-xp">
            <TextView textStyle={TextStyle.META2_EMPHASIZED}>{t('xpGained', {n: result.xp})}</TextView>
            <ProgressIndicator
              className="result-xp-bar"
              value={xpLevel.into}
              maximumValue={xpLevel.span}
              announceUpdatesForAccessibility={false}
              aria-label={t('xpProgress', {into: xpLevel.into, span: xpLevel.span, level: xpLevel.level + 1})}
            />
            <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {t('levelIn', {level: xpLevel.level + 1, xp: xpLevel.missing})}
            </TextView>
          </div>
          <div className="result-train">
            <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {t('trainLetters')}
            </TextView>
            {summary.worst.length > 0 ? (
              summary.worst.map(letter => <Tag key={letter} text={letter} />)
            ) : (
              <TextView textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
                {t('trainNone')}
              </TextView>
            )}
          </div>
        </div>
        <div className="action-dock">
          <ButtonGroup>
            <Button
              title={t('nextRound')}
              icon={mediaSkipForwardFilled}
              material={nextMaterial}
              alwaysShowText
              onClick={() => navigate(nextPath, {replace: true})}
            />
            <Button
              title={t('repeatRound')}
              icon={rotateCounterClockwiseFilled}
              alwaysShowText
              onClick={() => navigate(repeatPath, {replace: true})}
            />
          </ButtonGroup>
        </div>
      </div>
    </Page>
  );
}
