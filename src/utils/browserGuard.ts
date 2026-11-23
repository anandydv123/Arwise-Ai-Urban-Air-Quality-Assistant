type GuardTarget = Window & {
  __AIRWISE_EXT_GUARD__?: boolean;
  __AIRWISE_PREV_ONERROR__?: OnErrorEventHandler;
};

export function isThirdPartyExtensionFetchError(
  event: Pick<ErrorEvent, 'filename' | 'message' | 'error'> | { reason: unknown }
): boolean {
  if ('reason' in event) {
    const reason = event.reason as { message?: unknown; stack?: unknown } | undefined;
    const msg = typeof reason?.message === 'string' ? reason.message : '';
    const stack = typeof reason?.stack === 'string' ? reason.stack : '';
    return (
      (stack.includes('chrome-extension://') || stack.includes('moz-extension://')) &&
      msg.includes('Cannot set property fetch')
    );
  }

  const filename = typeof event.filename === 'string' ? event.filename : '';
  const message = typeof event.message === 'string' ? event.message : '';
  const errObj = event.error as { stack?: unknown } | undefined;
  const stack = typeof errObj?.stack === 'string' ? errObj.stack : '';

  const isExtensionOrigin =
    filename.startsWith('chrome-extension://') ||
    filename.startsWith('moz-extension://') ||
    stack.includes('chrome-extension://') ||
    stack.includes('moz-extension://');

  if (!isExtensionOrigin) {
    return false;
  }

  return (
    message.includes('Cannot set property fetch') ||
    filename.includes('/scripts/inspector.js') ||
    stack.includes('/scripts/inspector.js')
  );
}

export function guardFetchDescriptor(targetWindow: Window): boolean {
  try {
    const desc = Object.getOwnPropertyDescriptor(targetWindow, 'fetch');
    if (!desc || !desc.get || desc.set || !desc.configurable) {
      return false;
    }

    const originalGet = desc.get;
    let overrideFetch: typeof targetWindow.fetch | undefined;

    Object.defineProperty(targetWindow, 'fetch', {
      configurable: true,
      enumerable: desc.enumerable ?? true,
      get() {
        return overrideFetch ?? originalGet.call(targetWindow);
      },
      set(nextValue: unknown) {
        if (typeof nextValue === 'function') {
          overrideFetch = nextValue as typeof targetWindow.fetch;
        }
      },
    });
    return true;
  } catch {
    return false;
  }
}

export function installBrowserGuards(targetWindow: GuardTarget = window): void {
  guardFetchDescriptor(targetWindow);

  if (targetWindow.__AIRWISE_EXT_GUARD__) {
    return;
  }
  targetWindow.__AIRWISE_EXT_GUARD__ = true;

  targetWindow.addEventListener(
    'error',
    (event: ErrorEvent) => {
      if (isThirdPartyExtensionFetchError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  targetWindow.addEventListener(
    'unhandledrejection',
    (event: PromiseRejectionEvent) => {
      if (isThirdPartyExtensionFetchError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}
