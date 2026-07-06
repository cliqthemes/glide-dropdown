import { debounce } from '../utils/debounce.js';

/**
 * Wraps a user-supplied `load(query, meta)` function with debouncing and a
 * request-token race guard: if query A is still in flight when query B is
 * issued, A's eventual resolution is silently dropped instead of clobbering
 * B's (already-rendered) results.
 */
export class AsyncLoader {
  constructor({ load, debounceMs = 200, onStart, onSuccess, onError }) {
    this.load = load;
    this.onStart = onStart;
    this.onSuccess = onSuccess;
    this.onError = onError;
    this._token = 0;
    this._controller = null;
    this._debounced = debounce((query, meta) => this._run(query, meta), debounceMs);
  }

  request(query, meta = {}) {
    this._debounced(query, meta);
  }

  requestImmediate(query, meta = {}) {
    this._debounced.cancel();
    this._run(query, meta);
  }

  async _run(query, meta) {
    const token = (this._token += 1);
    this._controller?.abort();
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this._controller = controller;

    this.onStart?.({ query, ...meta });
    try {
      const result = await this.load(query, { ...meta, signal: controller?.signal });
      if (token !== this._token) return; // superseded by a newer request
      const { items, hasMore } = Array.isArray(result)
        ? { items: result, hasMore: false }
        : { items: result?.items ?? [], hasMore: !!result?.hasMore };
      this.onSuccess?.({ query, items, hasMore, ...meta });
    } catch (error) {
      if (token !== this._token) return;
      if (error?.name === 'AbortError') return;
      this.onError?.({ query, error, ...meta });
    }
  }

  cancel() {
    this._debounced.cancel();
    this._controller?.abort();
  }

  destroy() {
    this.cancel();
  }
}
