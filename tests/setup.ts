import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  if (!('ResizeObserver' in window)) {
    class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (window as unknown as { ResizeObserver: typeof MockResizeObserver }).ResizeObserver =
      MockResizeObserver;
  }
}
