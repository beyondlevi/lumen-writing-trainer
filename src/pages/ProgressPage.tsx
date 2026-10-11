import {Page, ScrollView, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {dayDate} from '../game/dates';
import {week} from '../game/save';
import {decimal, t, weekday} from '../i18n/strings';
import {useGame} from '../state/GameProvider';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
/** Below this accuracy a letter is outlined, to be trained. */
const WEAK = 0.8;

/** Speed per day over the last week, and the share of each letter right the first time. */
export function ProgressPage() {
  const {save, today} = useGame();
  const days = week(save, today);
  const top = Math.max(1, ...days.map(day => day.wpm ?? 0));
  return (
    <Page headerText={t('progressHeader')} enableSystemBarInset={false}>
      <ScrollView insetForHeader tabIndex={0} ariaLabel={t('progressLabel')}>
        <div className="content-inset progress">
          <section className="progress-section">
            <TextView as="h2" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {t('weekTitle')}
            </TextView>
            <ol className="week">
              {days.map(day => {
                const name = weekday(dayDate(day.day));
                const isToday = day.day === today;
                return (
                  <li
                    key={day.day}
                    className="week-day"
                    aria-label={day.wpm == null ? t('dayNone', {day: name}) : t('dayBar', {day: name, wpm: t('wpm', {wpm: decimal(day.wpm)})})}>
                    <TextView textStyle={TextStyle.META3} textColor={isToday ? TextColor.PRIMARY : TextColor.SECONDARY}>
                      {day.wpm == null ? t('none') : decimal(day.wpm)}
                    </TextView>
                    <span className="week-track">
                      <span
                        className={isToday ? 'week-bar week-bar--today' : 'week-bar'}
                        style={{blockSize: `${Math.round(((day.wpm ?? 0) / top) * 100)}%`}}
                      />
                    </span>
                    <TextView textStyle={TextStyle.META3} textColor={TextColor.SECONDARY}>
                      {name}
                    </TextView>
                  </li>
                );
              })}
            </ol>
          </section>
          <section className="progress-section">
            <TextView as="h2" textStyle={TextStyle.META2} textColor={TextColor.SECONDARY}>
              {t('lettersTitle')}
            </TextView>
            <ul className="letter-grid">
              {LETTERS.map(letter => {
                const tally = save.letters[letter];
                const share = tally != null && tally.attempts > 0 ? tally.hits / tally.attempts : null;
                const pct = share == null ? null : Math.round(share * 100);
                const classes = ['letter-cell', share == null ? 'letter-cell--none' : share < WEAK ? 'letter-cell--weak' : ''];
                return (
                  <li
                    key={letter}
                    className={classes.join(' ').trim()}
                    aria-label={pct == null ? t('letterNone', {letter}) : t('letterCell', {letter, pct})}>
                    <TextView textStyle={TextStyle.META2_EMPHASIZED}>{letter}</TextView>
                    <TextView textStyle={TextStyle.META3} textColor={TextColor.SECONDARY}>
                      {pct == null ? t('none') : String(pct)}
                    </TextView>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </ScrollView>
    </Page>
  );
}
