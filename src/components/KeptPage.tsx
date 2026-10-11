import {useEffect, useRef, useState, type ReactElement, type ReactNode, type Ref} from 'react';

/**
 * A page that stays mounted above the routes. Hidden, it goes under them
 * (they are drawn opaque over it) and takes no focus, keys, pointer or screen
 * reader; it keeps its elements and drawing, so showing it again only brings
 * it back on top. Inert follows one frame later both ways: setting or lifting
 * it restyles every element in the page, which would delay the frame that
 * shows the page coming back. `onLive` runs once it can take the focus again.
 */
export function KeptPage({
  shown,
  onLive,
  children,
  ref,
}: {
  shown: boolean;
  onLive?: () => void;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
}) {
  const [live, setLive] = useState(shown);
  // Inert goes on or off one frame after the page moves: the page that leaves
  // is already under the routes, and the one that comes back is drawn first.
  useEffect(() => {
    let timer = 0;
    const frame = window.requestAnimationFrame(() => {
      timer = window.setTimeout(() => setLive(shown));
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [shown]);
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;
  useEffect(() => {
    if (shown && live) {
      onLiveRef.current?.();
    }
  }, [live, shown]);
  return (
    <div
      ref={ref}
      className={shown ? 'kept-page' : 'kept-page kept-page--hidden'}
      inert={!live}
      aria-hidden={!shown}>
      {children}
    </div>
  );
}

/** Mounted from the first time it is shown, then kept. */
export function useMountedOnce(shown: boolean): boolean {
  const [mounted, setMounted] = useState(shown);
  if (shown && !mounted) {
    setMounted(true);
  }
  return mounted || shown;
}

/** Hidden, a kept page shows what it last rendered: its element is built only while shown. */
export function useKeptView(shown: boolean, build: () => ReactElement): ReactElement {
  const view = useRef<ReactElement | null>(null);
  if (shown || view.current == null) {
    view.current = build();
  }
  return view.current;
}
