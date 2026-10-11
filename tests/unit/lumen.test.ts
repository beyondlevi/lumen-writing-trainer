import {describe, expect, it, vi} from 'vitest';
import {parseContentSetting, resolveContentLang} from '../../src/lumen/config';
import {lumenWriting} from '../../src/lumen/writing';

describe('content language setting', () => {
  it('reads English, Português and anything else as Auto', () => {
    expect(['English', 'en', ' EN-us ', 'Inglês'].map(parseContentSetting)).toEqual(['en', 'en', 'en', 'en']);
    expect(['Português', 'portugues', 'pt-BR', 'PT'].map(parseContentSetting)).toEqual(['pt', 'pt', 'pt', 'pt']);
    expect(['Auto', '', undefined, 'Deutsch'].map(parseContentSetting)).toEqual(['auto', 'auto', 'auto', 'auto']);
  });

  it('follows the device language on Auto', () => {
    expect(resolveContentLang('auto', 'pt')).toBe('pt');
    expect(resolveContentLang('en', 'pt')).toBe('en');
  });
});

describe('Lumen writing API', () => {
  it('is used only when all of it is there', () => {
    expect(lumenWriting({})).toBeNull();
    expect(lumenWriting({lumen: {}})).toBeNull();
    expect(lumenWriting({lumen: {writing: {train: async () => true}}})).toBeNull();
  });

  it('passes calls through and survives a failing host', async () => {
    const train = vi.fn(async () => {
      throw new Error('busy');
    });
    const remove = vi.fn();
    const onState = vi.fn(() => remove);
    const stop = vi.fn(() => {
      throw new Error('gone');
    });
    const writing = lumenWriting({lumen: {writing: {train, onState, stop}}});
    expect(writing).not.toBeNull();
    await expect(writing?.train({text: 'casa', lang: 'pt'})).resolves.toBe(false);
    expect(train).toHaveBeenCalledWith({text: 'casa', lang: 'pt'});
    writing?.onState(() => {})();
    expect(remove).toHaveBeenCalled();
    expect(() => writing?.stop()).not.toThrow();
  });
});
