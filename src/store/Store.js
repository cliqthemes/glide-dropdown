/**
 * Small reactive state container. Mutations are batched into a microtask so
 * several synchronous `setState` calls (e.g. during init, or a keydown that
 * updates both `query` and `activeId`) coalesce into a single render pass.
 */
export class Store {
  constructor(initialState) {
    this.state = { ...initialState };
    this.itemsById = new Map();
    this.groupsById = new Map();
    this._listeners = new Set();
    this._scheduled = false;
  }

  get(key) {
    return this.state[key];
  }

  setState(patch) {
    Object.assign(this.state, patch);
    this._schedule();
  }

  /** Bypasses batching — used only when a synchronous read-after-write is required. */
  setStateSync(patch) {
    Object.assign(this.state, patch);
    for (const fn of this._listeners) fn(this.state);
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  _schedule() {
    if (this._scheduled) return;
    this._scheduled = true;
    queueMicrotask(() => {
      this._scheduled = false;
      for (const fn of this._listeners) fn(this.state);
    });
  }

  setCollections(items, groups) {
    this.itemsById.clear();
    this.groupsById.clear();
    for (const item of items) this.itemsById.set(item.id, item);
    for (const group of groups) this.groupsById.set(group.id, group);
    this.setState({ items, groups });
  }

  getItem(id) {
    return this.itemsById.get(id) ?? null;
  }

  getGroup(id) {
    return this.groupsById.get(id) ?? null;
  }

  findItemByValue(value) {
    for (const item of this.state.items) {
      if (item.value === String(value)) return item;
    }
    return null;
  }

  destroy() {
    this._listeners.clear();
  }
}
