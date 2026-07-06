import { raf, caf } from '../utils/debounce.js';

/**
 * Windowed list renderer: only the rows intersecting the viewport (plus
 * overscan) ever touch the DOM. DOM nodes are recycled between renders
 * instead of destroyed/recreated, so scrolling a 10,000-row list allocates
 * zero new elements after the first paint.
 *
 * This class knows nothing about "options" or "groups" — it just positions
 * opaque rows by index. The renderer supplies `renderRow(index)` to build/
 * update the actual content for a given index.
 */
export class VirtualList {
  constructor({ viewport, content, rowHeight, overscan = 8, renderRow, releaseRow }) {
    this.viewport = viewport;
    this.content = content;
    this.rowHeight = rowHeight;
    this.overscan = overscan;
    this.renderRow = renderRow;
    this.releaseRow = releaseRow;

    this.count = 0;
    this.heights = null; // prefix-sum offsets, only allocated when rows have custom heights
    this.totalHeight = 0;

    this.rendered = new Map(); // index -> element currently in the DOM
    this.pool = []; // detached elements available for reuse

    this._rafId = null;
    this._onScroll = () => this._scheduleUpdate();
    this.viewport.addEventListener('scroll', this._onScroll, { passive: true });
  }

  /**
   * @param count total number of rows
   * @param getRowHeight optional (index) => number for variable-height rows (e.g. group headers).
   *   Omit for the uniform-height fast path (index * rowHeight, no allocation).
   */
  setCount(count, getRowHeight) {
    this.count = count;
    if (getRowHeight) {
      const offsets = new Float64Array(count + 1);
      for (let i = 0; i < count; i += 1) {
        offsets[i + 1] = offsets[i] + getRowHeight(i);
      }
      this.heights = offsets;
      this.totalHeight = offsets[count];
    } else {
      this.heights = null;
      this.totalHeight = count * this.rowHeight;
    }
    this.content.style.height = `${this.totalHeight}px`;
    this.update();
  }

  _offsetOf(index) {
    return this.heights ? this.heights[index] : index * this.rowHeight;
  }

  _heightOf(index) {
    return this.heights ? this.heights[index + 1] - this.heights[index] : this.rowHeight;
  }

  _indexAtOffset(offset) {
    if (!this.heights) return Math.floor(offset / this.rowHeight);
    // Binary search the prefix-sum array for variable row heights.
    let lo = 0;
    let hi = this.count - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.heights[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  _scheduleUpdate() {
    if (this._rafId != null) return;
    this._rafId = raf(() => {
      this._rafId = null;
      this.update();
    });
  }

  update() {
    if (this.count === 0) {
      this._clearAll();
      return;
    }

    const scrollTop = this.viewport.scrollTop;
    const viewportHeight = this.viewport.clientHeight;
    const startIndex = Math.max(0, this._indexAtOffset(scrollTop) - this.overscan);
    const endIndex = Math.min(
      this.count - 1,
      this._indexAtOffset(scrollTop + viewportHeight) + this.overscan,
    );

    for (const [index, el] of this.rendered) {
      if (index < startIndex || index > endIndex) {
        this.rendered.delete(index);
        this.releaseRow?.(el, index);
        el.remove();
        this.pool.push(el);
      }
    }

    for (let index = startIndex; index <= endIndex; index += 1) {
      let el = this.rendered.get(index);
      const isNew = !el;
      if (!el) {
        el = this.pool.pop();
      }
      el = this.renderRow(index, el);
      if (!el) continue;
      if (isNew || el.parentNode !== this.content) this.content.appendChild(el);
      el.style.transform = `translateY(${this._offsetOf(index)}px)`;
      el.style.height = `${this._heightOf(index)}px`;
      this.rendered.set(index, el);
    }
  }

  scrollToIndex(index, align = 'auto') {
    const offset = this._offsetOf(index);
    const height = this._heightOf(index);
    const viewportHeight = this.viewport.clientHeight;
    const scrollTop = this.viewport.scrollTop;

    if (align === 'start' || offset < scrollTop) {
      this.viewport.scrollTop = offset;
    } else if (align === 'end' || offset + height > scrollTop + viewportHeight) {
      this.viewport.scrollTop = offset + height - viewportHeight;
    }
  }

  isNearBottom(threshold = 80) {
    const { scrollTop, clientHeight, scrollHeight } = this.viewport;
    return scrollTop + clientHeight >= scrollHeight - threshold;
  }

  _clearAll() {
    for (const [index, el] of this.rendered) {
      this.releaseRow?.(el, index);
      el.remove();
      this.pool.push(el);
    }
    this.rendered.clear();
    this.content.style.height = '0px';
  }

  destroy() {
    if (this._rafId != null) caf(this._rafId);
    this.viewport.removeEventListener('scroll', this._onScroll);
    this._clearAll();
    this.pool.length = 0;
  }
}
