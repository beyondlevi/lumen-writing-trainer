// Scripted stand-ins for what the Lumen host injects into the page.

/**
 * `window.lumen.writing`, recording every call in `window.__writing.calls`;
 * `window.__writing.emit(state)` plays the band's writing state.
 */
export const FAKE_WRITING = `(() => {
  const calls = [];
  const listeners = new Set();
  window.__writing = {
    calls,
    emit(state) {
      for (const listener of [...listeners]) listener(state);
    },
  };
  window.lumen = window.lumen ?? {};
  window.lumen.writing = {
    train(request) {
      calls.push(['train', request == null ? null : {text: request.text, lang: request.lang}]);
      return Promise.resolve(true);
    },
    onState(callback) {
      calls.push(['onState']);
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    stop() {
      calls.push(['stop']);
    },
  };
})();`;

/** `window.lumen.config` with the given values (the app's settings, set from the phone). */
export function fakeConfig(values) {
  return `(() => {
    window.lumen = window.lumen ?? {};
    window.lumen.config = {
      get: () => Promise.resolve(${JSON.stringify(values)}),
      onChange: () => () => {},
    };
  })();`;
}
