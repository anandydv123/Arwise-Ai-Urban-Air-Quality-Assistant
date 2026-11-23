import { describe, expect, it, vi } from 'vitest';
import {
  guardFetchDescriptor,
  installBrowserGuards,
  isThirdPartyExtensionFetchError,
} from '../../src/utils/browserGuard.ts';

describe('browserGuard utility', () => {
  it('bridges a configurable getter-only fetch descriptor so assignment does not throw', () => {
    const baseFetch = vi.fn(async () => new Response('ok'));
    const mockWin = {} as unknown as Window;

    Object.defineProperty(mockWin, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return baseFetch;
      },
    });

    expect(() => {
      (mockWin as unknown as { fetch: unknown }).fetch = vi.fn();
    }).toThrow(TypeError);

    const guarded = guardFetchDescriptor(mockWin);
    expect(guarded).toBe(true);
    expect(mockWin.fetch).toBe(baseFetch);

    const wrappedFetch = vi.fn(async () => new Response('wrapped'));
    expect(() => {
      (mockWin as unknown as { fetch: typeof wrappedFetch }).fetch = wrappedFetch;
    }).not.toThrow();
    expect(mockWin.fetch).toBe(wrappedFetch);
  });

  it('returns false safely without throwing when fetch is non-configurable', () => {
    const mockWin = {} as unknown as Window;
    Object.defineProperty(mockWin, 'fetch', {
      configurable: false,
      enumerable: true,
      get() {
        return vi.fn();
      },
    });

    expect(guardFetchDescriptor(mockWin)).toBe(false);
  });

  it('identifies chrome-extension inspector fetch errors while leaving app errors untouched', () => {
    expect(
      isThirdPartyExtensionFetchError({
        filename: 'chrome-extension://dbjbempljhcmhlfpfacalomonjpalpko/scripts/inspector.js',
        message: 'Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter',
        error: new TypeError('Cannot set property fetch of #<Window> which has only a getter'),
      })
    ).toBe(true);

    expect(
      isThirdPartyExtensionFetchError({
        filename: 'https://ais-dev.example.run.app/src/App.tsx',
        message: 'TypeError: Cannot read properties of undefined',
        error: new TypeError('Cannot read properties of undefined'),
      })
    ).toBe(false);
  });

  it('installs capture-phase listener that prevents only extension fetch TypeErrors', () => {
    const listeners: Record<string, ((e: Event) => void)[]> = {};
    const mockWin = {
      addEventListener: (type: string, fn: (e: Event) => void) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
    } as unknown as Window;

    installBrowserGuards(mockWin);
    expect(listeners.error).toHaveLength(1);

    const extEvent = new ErrorEvent('error', {
      cancelable: true,
      filename: 'chrome-extension://dbjbempljhcmhlfpfacalomonjpalpko/scripts/inspector.js',
      message: 'TypeError: Cannot set property fetch of #<Window> which has only a getter',
    });
    const stopSpy = vi.spyOn(extEvent, 'stopImmediatePropagation');
    listeners.error[0](extEvent);
    expect(extEvent.defaultPrevented).toBe(true);
    expect(stopSpy).toHaveBeenCalledTimes(1);

    const appEvent = new ErrorEvent('error', {
      cancelable: true,
      filename: 'http://localhost:3000/src/main.tsx',
      message: 'ReferenceError: something is not defined',
    });
    listeners.error[0](appEvent);
    expect(appEvent.defaultPrevented).toBe(false);
  });
});
