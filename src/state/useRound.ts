import {useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent} from 'react';
import type {Lang} from '../content/bank';
import type {Item, Mode} from '../content/levels';
import {RoundTracker, type RoundSummary} from '../game/round';
import {lumenWriting, type WritingState} from '../lumen/writing';

/** The band's writing state; 'none' without Lumen's writing API. */
export type BandState = WritingState | 'none';

export type Round = {
  tracker: RoundTracker;
  /** Bumped whenever the round changes, to draw it again. */
  version: number;
  band: BandState;
  paused: boolean;
  /** Whether the wearer has started writing (the first letter came). */
  started: boolean;
  fieldRef: React.RefObject<HTMLInputElement | null>;
  onInput(event: FormEvent<HTMLInputElement>): void;
  onKeyDown(event: KeyboardEvent<HTMLInputElement>): void;
};

/**
 * Runs one round on a real text field: clears it once before the round, tells
 * Lumen what is about to be written (`train`), focuses it, and from then on
 * only reads it. The band's writing state pauses and resumes the clock.
 */
export function useRound({
  mode,
  items,
  lang,
  onDone,
}: {
  mode: Mode;
  items: readonly Item[];
  lang: Lang;
  onDone(summary: RoundSummary): void;
}): Round {
  const tracker = useMemo(() => new RoundTracker(mode, items), [mode, items]);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(value => value + 1), []);
  const writing = useMemo(() => lumenWriting(), []);
  const [band, setBand] = useState<BandState>(writing == null ? 'none' : 'off');
  const fieldRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  const wrote = useRef(false);
  const phrase = useRef(0);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const field = fieldRef.current;
    if (field != null) {
      field.value = '';
    }
    finished.current = false;
    wrote.current = false;
    phrase.current = 0;
    void writing?.train({text: mode === 'words' ? items.map(item => item.text).join(' ') : items[0].text, lang});
    field?.focus({preventScroll: true});
    const remove = writing?.onState(state => {
      const now = performance.now();
      if (state === 'writing') {
        wrote.current = true;
        tracker.resume(now);
      } else if (state === 'off' && wrote.current && !tracker.done) {
        tracker.pause(now);
      }
      setBand(state);
      bump();
    });
    return () => {
      remove?.();
      if (!finished.current) {
        writing?.stop();
        void writing?.train(null);
      }
    };
  }, [bump, items, lang, mode, tracker, writing]);

  // The page transition may move the focus after the page mounts: the field keeps it.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const field = fieldRef.current;
      if (field != null && document.activeElement !== field && !finished.current) {
        field.focus({preventScroll: true});
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  const onInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      if (finished.current) {
        return;
      }
      tracker.update(event.currentTarget.value, performance.now());
      if (tracker.done) {
        finished.current = true;
        writing?.stop();
        void writing?.train(null);
        onDoneRef.current(tracker.summary());
      } else if (mode === 'phrases' && tracker.current() !== phrase.current) {
        phrase.current = tracker.current();
        void writing?.train({text: items[phrase.current].text, lang});
      }
      bump();
    },
    [bump, items, lang, mode, tracker, writing],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // The field is read from its end: swipes don't move its caret.
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        return;
      }
      // Paused, the index tap asks Lumen to write again, from where the wearer stopped.
      if (event.key === 'Enter' && tracker.paused && !finished.current) {
        event.preventDefault();
        void writing?.train({text: tracker.remainingText(), lang});
      }
    },
    [lang, tracker, writing],
  );

  // A phrase round's clock and speed move on screen while the wearer writes.
  const started = tracker.startedAt != null;
  const paused = tracker.paused;
  useEffect(() => {
    if (mode !== 'phrases' || !started || paused || tracker.done) {
      return;
    }
    const timer = window.setInterval(bump, 1000);
    return () => window.clearInterval(timer);
  }, [bump, mode, paused, started, tracker]);

  return {tracker, version, band, paused, started, fieldRef, onInput, onKeyDown};
}
