/**
 * Debug logging for verifying the dashboard reaches the Railway backends.
 *
 * Enable with:  localStorage.setItem('nad_debug', '1')   (then reload)
 * Disable with: localStorage.removeItem('nad_debug')
 *
 * Credentials and bearer tokens are never logged - only presence/flags.
 */

const KEY = 'nad_debug';

export function debugEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setDebug(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

function write(level: 'log' | 'warn' | 'error', args: unknown[]) {
  console[level]('[NAD-DEBUG]', ...args);
}

export const debugLog = (...args: unknown[]) => {
  if (debugEnabled()) write('log', args);
};

export const debugWarn = (...args: unknown[]) => {
  if (debugEnabled()) write('warn', args);
};

export const debugError = (...args: unknown[]) => {
  if (debugEnabled()) write('error', args);
};

/**
 * Log a fetch attempt: method, URL, timing, and the resulting status.
 * Safe to call unconditionally - it no-ops when debugging is off.
 */
export async function traceRequest(
  label: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!debugEnabled()) return fetch(url, init);

  const method = init.method ?? 'GET';
  const started = performance.now();

  debugLog(`--> ${label} ${method} ${url}`);
  if (init.headers) {
    const h = new Headers(init.headers);
    const auth = h.get('authorization');
    h.set('authorization', auth ? `Bearer <redacted ${auth.length} chars>` : '<none>');
    debugLog(`    request headers:`, Object.fromEntries(h.entries()));
  }

  try {
    const res = await fetch(url, init);
    const ms = (performance.now() - started).toFixed(0);
    const note =
      res.status === 401 || res.status === 403
        ? '  <- AUTH REQUIRED (no/invalid token)'
        : res.status >= 400
          ? '  <- REQUEST FAILED'
          : '';
    debugLog(`<-- ${label} ${method} ${url} -> ${res.status} ${res.statusText} in ${ms}ms${note}`);
    return res;
  } catch (err) {
    const ms = (performance.now() - started).toFixed(0);
    debugError(
      `<-- ${label} ${method} ${url} -> NETWORK ERROR after ${ms}ms:`,
      err instanceof Error ? `${err.name}: ${err.message}` : err,
      '(check Network tab for CORS / DNS / mixed-content failures)',
    );
    throw err;
  }
}

/** Log an ApiError from customFetch with its request info and parsed body. */
export function traceApiError(label: string, err: unknown) {
  if (!debugEnabled()) return;

  const e = err as {
    name?: string;
    message?: string;
    status?: number;
    body?: unknown;
    requestInfo?: { method?: string; url?: string };
  };

  debugError(`${label} failed:`);
  debugError(`    ${e.name ?? 'Error'}: ${e.message ?? '(no message)'}`);
  if (e.requestInfo) {
    debugError(`    request: ${e.requestInfo.method ?? '?'} ${e.requestInfo.url ?? '?'}`);
  }
  if (e.status != null) debugError(`    status: ${e.status}`);

  let body = e.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* keep raw */
    }
  }
  debugError('    body:', body ?? '(empty)');
}

/** Log which backend URLs the app resolved at startup. */
export function logConfig(nap: string, nad: string) {
  debugLog('resolved backend URLs:');
  debugLog(`    NAP (programs/schemes/categories/notifications): ${nap}`);
  debugLog(`    NAD (partners/gallery/stories/auth):            ${nad}`);
  debugLog(`    page origin: ${location.origin}`);
}

/**
 * Wrap window.fetch so EVERY request the page makes is logged while debugging
 * is on - including ones made by generated hooks we don't hand-instrument.
 *
 * Idempotent: safe to call on every render. Install once at app start.
 */
export function installFetchTracer() {
  if ((window as unknown as { __nadFetchTraced?: boolean }).__nadFetchTraced) return;
  (window as unknown as { __nadFetchTraced?: boolean }).__nadFetchTraced = true;

  const original = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!debugEnabled()) return original(input, init);

    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    const started = performance.now();

    // Only trace cross-origin calls; same-origin Vite asset noise is ignored.
    const isCrossOrigin = url.startsWith('http');
    if (!isCrossOrigin) return original(input, init);

    debugLog(`--> ${method} ${url}`);
    try {
      const res = await original(input, init);
      const ms = (performance.now() - started).toFixed(0);
      const tag =
        res.status === 401 || res.status === 403
          ? '  <- AUTH REQUIRED'
          : res.status >= 500
            ? '  <- SERVER ERROR'
            : res.status >= 400
              ? '  <- CLIENT ERROR'
              : '  <- ok';
      debugLog(`<-- ${method} ${url} -> ${res.status} in ${ms}ms${tag}`);
      return res;
    } catch (err) {
      const ms = (performance.now() - started).toFixed(0);
      debugError(
        `<-- ${method} ${url} -> NETWORK ERROR after ${ms}ms`,
        err instanceof Error ? `${err.name}: ${err.message}` : err,
      );
      throw err;
    }
  };

  debugLog('fetch tracer installed');
}