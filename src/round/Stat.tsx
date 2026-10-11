import {CornerRadius, RoundedRectangleShapeProvider, StaticContainer, TextColor, TextStyle, TextView} from '@wearables-ui-toolkit/mrbd';
import {useMemo} from 'react';

/** One figure (speed, time, accuracy…) with its name, on its own surface. */
export function Stat({value, label}: {value: string; label: string}) {
  const shape = useMemo(() => new RoundedRectangleShapeProvider(CornerRadius.SMALL), []);
  return (
    <StaticContainer width="100%" shapeProvider={shape}>
      <div className="stat">
        <span className="stat-value uit-text-heading2">{value}</span>
        <TextView textStyle={TextStyle.META3} textColor={TextColor.SECONDARY}>
          {label}
        </TextView>
      </div>
    </StaticContainer>
  );
}
