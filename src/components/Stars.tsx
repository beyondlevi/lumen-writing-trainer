import starFilled from '@wearables-ui-toolkit/icons/svg/star__filled.svg';
import {IconImage} from '@wearables-ui-toolkit/mrbd';
import {t} from '../i18n/strings';

/** Three stars, the earned ones bright and the others dim. */
export function Stars({count, large = false}: {count: number; large?: boolean}) {
  return (
    <span className={large ? 'stars stars--large' : 'stars'} role="img" aria-label={t('starsOf', {n: count})}>
      {[1, 2, 3].map(star => (
        <IconImage
          key={star}
          source={starFilled}
          className={star <= count ? 'star' : 'star star--missing uit-color-icon-secondary'}
        />
      ))}
    </span>
  );
}
