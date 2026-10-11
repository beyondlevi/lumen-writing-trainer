// The "Content language" setting (`lumen_config`, set from the phone): Auto
// follows the device language, English or Português force the words and
// phrases to write. The interface keeps the device language either way.
//
// In a desktop browser (no `window.lumen.config`) the value comes from
// `?content.language=pt` and is kept in localStorage.
import type {Lang} from '../content/bank';

export const CONTENT_LANGUAGE_KEY = 'content.language';
export const DEV_STORAGE_KEY = 'lumen-writing-trainer.dev-config';

export type ContentSetting = Lang | 'auto';

type LumenConfigApi = {
  get(): Promise<Record<string, string>>;
  onChange(callback: (values?: Record<string, string>) => void): unknown;
};

declare global {
  interface LumenHost {
    config?: LumenConfigApi;
  }
}

/** Reads the setting's free text: "English", "en", "Português", "pt-BR"… anything else is Auto. */
export function parseContentSetting(value: unknown): ContentSetting {
  if (typeof value !== 'string') {
    return 'auto';
  }
  const text = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  if (/^(en|eng|english|ingles)\b/.test(text)) {
    return 'en';
  }
  if (/^(pt|por|portugues|portuguese)\b/.test(text)) {
    return 'pt';
  }
  return 'auto';
}

export function resolveContentLang(setting: ContentSetting, deviceLang: Lang): Lang {
  return setting === 'auto' ? deviceLang : setting;
}

/** Follows the setting: calls `callback` with it now (once known) and on every change. Returns a stop function. */
export function watchContentSetting(callback: (setting: ContentSetting) => void): () => void {
  const config = window.lumen?.config;
  let live = true;
  if (config != null && typeof config.get === 'function') {
    const read = (values?: Record<string, string>) => {
      const source = values != null ? Promise.resolve(values) : config.get();
      source.then(
        current => live && callback(parseContentSetting(current?.[CONTENT_LANGUAGE_KEY])),
        () => live && callback('auto'),
      );
    };
    read();
    let remove: unknown = null;
    try {
      remove = config.onChange(values => read(values));
    } catch {
      remove = null;
    }
    return () => {
      live = false;
      if (typeof remove === 'function') {
        remove();
      }
    };
  }
  callback(devSetting());
  return () => {
    live = false;
  };
}

/** Desktop fallback: `?content.language=…` (kept for later visits), then what was kept. */
function devSetting(): ContentSetting {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(CONTENT_LANGUAGE_KEY);
    if (fromUrl != null) {
      window.localStorage.setItem(DEV_STORAGE_KEY, fromUrl);
      url.searchParams.delete(CONTENT_LANGUAGE_KEY);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      return parseContentSetting(fromUrl);
    }
    return parseContentSetting(window.localStorage.getItem(DEV_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}
