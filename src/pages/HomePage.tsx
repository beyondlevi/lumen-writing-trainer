import boltFilled from '@wearables-ui-toolkit/icons/svg/bolt__filled.svg';
import calendarBadgeStarFilled from '@wearables-ui-toolkit/icons/svg/calendarbadgestar__filled.svg';
import chartBarFilled from '@wearables-ui-toolkit/icons/svg/chartbar__filled.svg';
import flameFilled from '@wearables-ui-toolkit/icons/svg/flame__filled.svg';
import speechBubbleQuoteFilled from '@wearables-ui-toolkit/icons/svg/speechbubblequote__filled.svg';
import starFilled from '@wearables-ui-toolkit/icons/svg/star__filled.svg';
import textCursorFilled from '@wearables-ui-toolkit/icons/svg/textcursor__filled.svg';
import {
  ActionHint,
  Chip,
  IconTintColor,
  ListItem,
  Page,
  ProgressIndicator,
  TimestampPosition,
  TimestampTextColor,
  VerticalList,
} from '@wearables-ui-toolkit/mrbd';
import {memo, useCallback, useLayoutEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {WORD_LEVELS} from '../content/levels';
import {currentLevel, streak} from '../game/save';
import {levelForXp} from '../game/scoring';
import {decimal, t} from '../i18n/strings';
import {KeptPage, useKeptView, useMountedOnce} from '../components/KeptPage';
import {useGame} from '../state/GameProvider';

export const HOME_PATH = '/';

type Row = 'words' | 'phrases' | 'daily' | 'progress';

const DESTINATIONS: Record<Row, string> = {
  words: '/trail/words',
  phrases: '/trail/phrases',
  daily: '/play/daily',
  progress: '/progress',
};

/** The Home rows a page path comes from, for the focus on Back. */
function rowOf(pathname: string): Row | null {
  if (pathname.startsWith('/trail/words') || pathname.startsWith('/play/words')) return 'words';
  if (pathname.startsWith('/trail/phrases') || pathname.startsWith('/play/phrases')) return 'phrases';
  if (pathname.startsWith('/play/daily')) return 'daily';
  if (pathname.startsWith('/progress')) return 'progress';
  return null;
}

/**
 * Home, kept mounted above the routes: hidden while another page is open,
 * shown again on Back with its rows as they were and the focus on the row the
 * wearer came from.
 */
export function Home() {
  const navigate = useNavigate();
  const {pathname} = useLocation();
  const {save, today} = useGame();
  const shown = pathname === HOME_PATH;
  const mounted = useMountedOnce(shown);

  const cameFrom = useRef<Row | null>(null);
  cameFrom.current = rowOf(pathname) ?? cameFrom.current;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const open = useCallback((row: Row) => navigateRef.current(DESTINATIONS[row]), []);

  const xp = levelForXp(save.xp);
  const wordsLevel = currentLevel(save, 'words');
  const view = useKeptView(shown, () => (
    <HomeView
      streak={streak(save, today)}
      level={xp.level}
      xpInto={xp.into}
      xpSpan={xp.span}
      bestWpm={Math.max(save.bestWpm.words, save.bestWpm.phrases)}
      wordsLevel={wordsLevel + 1}
      wordsStars={save.best.words[wordsLevel]?.stars ?? 0}
      phrasesWpm={save.bestWpm.phrases}
      dailyDone={save.dailyDone === today}
      onOpen={open}
    />
  ));

  const layerRef = useRef<HTMLDivElement>(null);
  const focusRow = useCallback(() => {
    const row = cameFrom.current;
    cameFrom.current = null;
    if (row != null) {
      layerRef.current?.querySelector<HTMLElement>(`[data-row="${row}"]`)?.focus();
    }
  }, []);

  if (!mounted) {
    return null;
  }
  return (
    <KeptPage ref={layerRef} shown={shown} onLive={focusRow}>
      {view}
    </KeptPage>
  );
}

type HomeViewProps = {
  streak: number;
  level: number;
  xpInto: number;
  xpSpan: number;
  bestWpm: number;
  wordsLevel: number;
  wordsStars: number;
  phrasesWpm: number;
  dailyDone: boolean;
  onOpen(row: Row): void;
};

const HomeView = memo(function HomeView({
  streak: days,
  level,
  xpInto,
  xpSpan,
  bestWpm,
  wordsLevel,
  wordsStars,
  phrasesWpm,
  dailyDone,
  onOpen,
}: HomeViewProps) {
  // The list starts below the summary (streak, level, speed, experience), which stays over its top.
  const summaryRef = useRef<HTMLDivElement>(null);
  const [summaryBottom, setSummaryBottom] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const summary = summaryRef.current;
    if (summary == null) {
      return;
    }
    const measure = () => setSummaryBottom(summary.offsetTop + summary.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(summary);
    return () => observer.disconnect();
  }, []);
  // The last row comes once the focus reaches the one before it: at launch every row on screen is whole.
  const [allRows, setAllRows] = useState(false);
  const showAllRows = useCallback(() => setAllRows(true), []);
  // The current level's stars: only those earned show (a star's shape, never a dimmer copy of it).
  const stars = Array.from({length: wordsStars}, () => ({
    icon: starFilled,
    accessibilityContentDescription: t('starEarned'),
    tintColor: IconTintColor.PRIMARY,
  }));
  return (
    <Page headerText={t('appName')} enableSystemBarInset={false}>
      <div className="home-shell">
        <div className="home-summary" ref={summaryRef}>
          <div className="chip-row">
            <Chip icon={flameFilled} text={days === 1 ? t('streakDay') : t('streakDays', {n: days})} />
            <Chip icon={starFilled} text={t('levelChip', {n: level})} />
            <Chip icon={boltFilled} text={t('wpm', {wpm: decimal(bestWpm)})} />
          </div>
          <ProgressIndicator
            className="home-xp"
            value={xpInto}
            maximumValue={xpSpan}
            announceUpdatesForAccessibility={false}
            aria-label={t('xpToLevel', {into: xpInto, span: xpSpan, next: level + 1})}
          />
        </div>
        <VerticalList insetForHeader headerHeight={summaryBottom} ariaLabel={t('homeLabel')}>
          <ListItem
            title={t('wordsRow')}
            subtitle={t('wordsSub', {n: wordsLevel, total: WORD_LEVELS.length})}
            icon={textCursorFilled}
            statusIndicatorIcons={stars.length > 0 ? stars : undefined}
            data-row="words"
            onClick={() => onOpen('words')}
          />
          <ListItem
            title={t('phrasesRow')}
            subtitle={t('phrasesSub')}
            icon={speechBubbleQuoteFilled}
            timestamp={t('wpm', {wpm: decimal(phrasesWpm)})}
            timestampPosition={TimestampPosition.ACCESSORY}
            timestampTextColor={TimestampTextColor.SECONDARY}
            data-row="phrases"
            onClick={() => onOpen('phrases')}
          />
          <ListItem
            title={t('dailyRow')}
            subtitle={t('dailySub')}
            icon={calendarBadgeStarFilled}
            timestamp={dailyDone ? t('dailyDone') : t('dailyBonus')}
            timestampPosition={TimestampPosition.ACCESSORY}
            timestampTextColor={TimestampTextColor.SECONDARY}
            data-row="daily"
            onFocus={showAllRows}
            onClick={() => onOpen('daily')}
          />
          {allRows ? (
            <ListItem
              title={t('progressRow')}
              subtitle={t('progressSub')}
              icon={chartBarFilled}
              data-row="progress"
              onClick={() => onOpen('progress')}
            />
          ) : null}
        </VerticalList>
        <div className="hint-dock">
          <ActionHint text={t('hintOpen')} />
          <ActionHint text={t('hintExit')} />
        </div>
      </div>
    </Page>
  );
});
