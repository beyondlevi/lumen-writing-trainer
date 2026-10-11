import type {Lang} from '../content/bank';
import {otherLang, type Level} from '../content/levels';
import {t} from '../i18n/strings';

/** A level's name; "In English" / "In Portuguese" names the other language of the content. */
export function levelTitle(level: Level, contentLang: Lang): string {
  if (level.id === 'phrasesOther') {
    return otherLang(contentLang) === 'en' ? t('level_phrasesOther_en') : t('level_phrasesOther_pt');
  }
  return t(`level_${level.id}`);
}
