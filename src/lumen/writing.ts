// Lumen's writing API (`window.lumen.writing`). With it, the index tap on the
// focused field writes with the band at once, Lumen shows its small writing bar
// instead of its panel, turns its suggestions and corrections off, and learns
// the wearer's handwriting by comparing what the band read with the text the
// app says is coming. Older Lumen versions and desktop browsers don't have it:
// the app works the same, without those extras.
import type {Lang} from '../content/bank';

export type WritingState = 'off' | 'preparing' | 'writing';

export type LumenWriting = {
  /** The text the wearer is about to write in the focused field, from its end; null clears it. */
  train(request: {text: string; lang: Lang} | null): Promise<boolean>;
  /** Calls back with the band's writing state; returns a function that removes `callback`. */
  onState(callback: (state: WritingState) => void): () => void;
  /** Ends the band's writing. */
  stop(): unknown;
};

declare global {
  interface LumenHost {
    writing?: Partial<LumenWriting>;
  }
  interface Window {
    lumen?: LumenHost;
  }
}

/** The writing API, when this Lumen has all of it. */
export function lumenWriting(host: {lumen?: LumenHost} = window): LumenWriting | null {
  const writing = host.lumen?.writing;
  if (
    writing == null ||
    typeof writing.train !== 'function' ||
    typeof writing.onState !== 'function' ||
    typeof writing.stop !== 'function'
  ) {
    return null;
  }
  const api = writing as LumenWriting;
  return {
    train: async request => {
      try {
        return (await api.train(request)) === true;
      } catch {
        return false;
      }
    },
    onState: callback => {
      try {
        const remove = api.onState(callback);
        return typeof remove === 'function' ? remove : () => {};
      } catch {
        return () => {};
      }
    },
    stop: () => {
      try {
        void Promise.resolve(api.stop()).catch(() => {});
      } catch {
        // The band's writing is over either way.
      }
    },
  };
}
