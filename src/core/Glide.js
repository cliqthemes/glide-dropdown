import { Store } from '../store/Store.js';
import { Renderer } from '../renderer/Renderer.js';
import { Keyboard } from '../keyboard/Keyboard.js';
import { AsyncLoader } from './AsyncLoader.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { normalizeFromSelect, normalizeFromArray, populateNativeSelect, createItem } from './normalize.js';
import { computeVisibleRows, firstSelectableIndex } from './visibleRows.js';
import { defaultTemplates } from '../renderer/templates.js';
import { nextId } from '../utils/dom.js';
import { defaultOptions } from './defaults.js';

const PAGE_STEP = 8;
const TYPEAHEAD_RESET_MS = 500;
const PRESENTATIONS = new Set(['dropdown', 'chips', 'always-open', 'accordion', 'popup']);

export class Glide {
  constructor(target, userOptions = {}) {
    this.el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!this.el) throw new Error('Glide: target element not found');

    this.options = { ...defaultOptions, ...userOptions };
    if (!PRESENTATIONS.has(this.options.presentation)) {
      throw new Error(`Glide: unknown presentation "${this.options.presentation}"`);
    }
    this.presentation = this.options.presentation;
    this.persistent = this.presentation === 'chips' || this.presentation === 'always-open';
    this.templates = { ...defaultTemplates, ...userOptions.templates };
    this.events = new EventEmitter();
    this._destroyed = false;
    this._typeaheadBuffer = '';
    this._typeaheadTimer = null;

    this.isNativeSelect = this.el.tagName === 'SELECT';
    this.multiple = this.isNativeSelect ? this.el.multiple : !!this.options.multiple;
    this.remote = typeof this.options.load === 'function';

    const { items, groups } = this._loadInitialData();

    this.ids = {
      combobox: nextId('glide-input'),
      listbox: nextId('glide-listbox'),
      dropdown: nextId('glide-dropdown'),
    };

    this.store = new Store({
      items: [],
      groups: [],
      query: '',
      open: false,
      activeId: null,
      selected: [],
      disabled: this.isNativeSelect ? this.el.disabled : !!this.options.disabled,
      loading: false,
      hasMore: false,
      page: 1,
      isTyping: false,
    });
    this.selectedSet = new Set();

    if (this.isNativeSelect) {
      this.el.style.display = 'none';
      this.el.setAttribute('aria-hidden', 'true');
      this.el.tabIndex = -1;
    }

    this.renderer = new Renderer({
      anchor: this.el,
      multiple: this.multiple,
      searchable: this.remote ? true : this.options.searchable,
      placeholder: this.options.placeholder,
      theme: this.options.theme,
      presentation: this.presentation,
      showSelectedChips: this.presentation !== 'always-open' || this.options.showSelectedChips,
      panelLabel: this.options.panelLabel,
      templates: this.templates,
      ids: this.ids,
      portal: this.options.portal,
      onHoverItem: (id) => this.setActive(id),
      onSelectItem: (id) => this._handleRowClick(id),
      onToggleGroup: (groupId) => this.toggleGroup(groupId),
    });
    this.renderer.mount();
    const addClasses = (el, classNames) => {
      if (!el || !classNames) return;
      for (const cls of classNames.split(/\s+/).filter(Boolean)) el.classList.add(cls);
    };
    addClasses(this.renderer.root, this.options.className);
    addClasses(this.renderer.control, this.options.controlClassName);
    addClasses(this.renderer.dropdown, this.options.dropdownClassName);

    this.dom = {
      root: this.renderer.root,
      control: this.renderer.control,
      input: this.renderer.input,
      dropdown: this.renderer.dropdown,
      viewport: this.renderer.viewport,
      content: this.renderer.content,
    };

    if (this.remote) {
      this.asyncLoader = new AsyncLoader({
        load: this.options.load,
        debounceMs: this.options.debounceMs,
        onStart: () => this.store.setState({ loading: true }),
        onSuccess: ({ items: rawItems, hasMore, page, append }) => {
          const { items: normalized } = normalizeFromArray(rawItems);
          const nextItems = append ? [...this.store.get('items'), ...normalized] : normalized;
          this.store.setCollections(nextItems, []);
          this.store.setState({ loading: false, hasMore, page });
          this.renderer.announce(
            normalized.length === 0 ? 'No results' : `${normalized.length} result${normalized.length === 1 ? '' : 's'} loaded`,
          );
        },
        onError: (payload) => {
          this.store.setState({ loading: false });
          this.events.emit('error', payload);
        },
      });
    }

    this._bindEvents();
    this.store.subscribe((state) => this._render(state));

    this.setCollections(items, groups, { preserveSelection: false });

    if (this.options.value !== undefined) {
      this._applyInitialSelection(this.options.value);
    } else if (!this.remote) {
      const initialIds = items.filter((item) => item.selected).map((item) => item.id);
      if (initialIds.length) this._setSelectedIds(this.multiple ? initialIds : initialIds.slice(0, 1), { silent: true });
    }

    this.setDisabled(this.store.get('disabled'));

    this.plugins = (this.options.plugins ?? []).filter(Boolean);
    for (const plugin of this.plugins) plugin.init?.(this);

    if (this.remote && this.options.loadOnInit !== false) {
      this.asyncLoader.request('', { page: 1, append: false });
    }

    if (this.persistent) this.open();
  }

  // ---------------------------------------------------------------- setup

  _loadInitialData() {
    // A <select> with real <option> children wins (upgrading existing markup).
    // Otherwise, if `options` was passed — including for an empty <select>,
    // the progressive-enhancement case — use that instead, and mirror it
    // into the native element so form submission still works.
    if (this.isNativeSelect && this.el.options.length > 0) {
      const { items, groups } = normalizeFromSelect(this.el);
      const placeholderIndex = !this.multiple
        ? items.findIndex((item) => item.value === '' && item.groupId == null)
        : -1;
      if (placeholderIndex !== -1) {
        this.options.placeholder = this.options.placeholder ?? items[placeholderIndex].label;
        items.splice(placeholderIndex, 1);
      }
      return { items, groups };
    }
    if (Array.isArray(this.options.options)) {
      const data = normalizeFromArray(this.options.options);
      if (this.isNativeSelect) populateNativeSelect(this.el, data.items, data.groups);
      return data;
    }
    return { items: [], groups: [] };
  }

  _applyInitialSelection(value) {
    const values = this.multiple ? (Array.isArray(value) ? value : [value]) : [value];
    const ids = values.map((v) => this._resolveItem(v)?.id).filter(Boolean);
    this._setSelectedIds(ids, { silent: true });
  }

  _bindEvents() {
    this.dom.control.addEventListener('click', (event) => {
      const removeBtn = event.target.closest('.glide-tag-remove');
      if (removeBtn) {
        this.deselect(removeBtn.dataset.itemId);
        this.dom.input.focus();
        return;
      }
      if (this.store.get('disabled')) return;
      this.dom.input.focus();
      this.open();
    });

    this.dom.control.addEventListener('keydown', (event) => {
      const removeBtn = event.target.closest('.glide-tag-remove');
      if (removeBtn && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        this.deselect(removeBtn.dataset.itemId);
        this.dom.input.focus();
      }
    });

    this.dom.input.addEventListener('input', () => this._handleInput());

    this.keyboard = new Keyboard(this.dom.input, {
      onArrowDown: () => (this.store.get('open') ? this._moveActive(1) : this.open()),
      onArrowUp: () => (this.store.get('open') ? this._moveActive(-1) : this.open()),
      onEnter: () => this._selectActive(),
      onEscape: () => {
        if (this.store.get('open')) this.close();
      },
      onTab: () => {
        if (this.store.get('open')) this.close();
      },
      onHome: () => {
        if (this.store.get('open')) this._moveActiveToEdge('start');
      },
      onEnd: () => {
        if (this.store.get('open')) this._moveActiveToEdge('end');
      },
      onPageUp: () => {
        if (this.store.get('open')) this._movePage(-1);
      },
      onPageDown: () => {
        if (this.store.get('open')) this._movePage(1);
      },
      onBackspace: (event) => {
        if (this.multiple && !this.dom.input.value && this.store.get('selected').length) {
          event.preventDefault();
          const ids = this.store.get('selected');
          this.deselect(ids[ids.length - 1]);
        }
      },
      onDelete: (event) => {
        if (this.multiple && !this.dom.input.value && this.store.get('selected').length) {
          event.preventDefault();
          const ids = this.store.get('selected');
          this.deselect(ids[ids.length - 1]);
        }
      },
    });

    this._onDocumentPointerDown = (event) => {
      if (this.persistent) return;
      if (!this.store.get('open')) return;
      if (this.dom.root.contains(event.target) || this.dom.dropdown.contains(event.target)) return;
      this.close();
    };
    document.addEventListener('pointerdown', this._onDocumentPointerDown, true);

    this.dom.viewport.addEventListener(
      'scroll',
      () => {
        if (!this.remote || !this.store.get('hasMore') || this.store.get('loading')) return;
        if (this.renderer.listRenderer.isNearBottom(this.options.loadMoreThreshold)) {
          this.asyncLoader.requestImmediate(this.store.get('query'), {
            page: this.store.get('page') + 1,
            append: true,
          });
        }
      },
      { passive: true },
    );
  }

  // --------------------------------------------------------------- render

  _computeRows(state) {
    const query = this.remote ? '' : state.query;
    return computeVisibleRows(state.items, state.groups, query, { fuzzy: this.options.fuzzy });
  }

  _render(state) {
    const rows = this._computeRows(state);
    const selectedItems = state.selected.map((id) => this.store.getItem(id)).filter(Boolean);

    this.renderer.setRows(rows, {
      activeId: state.activeId,
      selectedSet: this.selectedSet,
      multiple: this.multiple,
      query: state.query,
      loading: state.loading,
    });
    this.renderer.setActive(state.activeId);
    this.renderer.renderControl(selectedItems, { query: state.query, isTyping: state.isTyping });
    this.renderer.setSelected(this.selectedSet);
    this.renderer.setDisabled(state.disabled);
  }

  // ------------------------------------------------------------- movement

  _handleInput() {
    if (this.store.get('disabled')) return;
    if (!this.store.get('open')) this.open();

    const value = this.dom.input.value;
    if (this.remote || this.options.searchable) {
      this.store.setState({ query: value, isTyping: !this.multiple, activeId: null });
      this.events.emit('search', { query: value });
      if (this.remote) {
        this.asyncLoader.request(value, { page: 1, append: false });
      } else {
        queueMicrotask(() => this._activateFirstMatch());
      }
    } else {
      this._typeahead(value);
    }
  }

  _typeahead(value) {
    clearTimeout(this._typeaheadTimer);
    this._typeaheadBuffer += value;
    this.dom.input.value = '';
    const buffer = this._typeaheadBuffer.toLowerCase();
    this._typeaheadTimer = setTimeout(() => {
      this._typeaheadBuffer = '';
    }, TYPEAHEAD_RESET_MS);

    const rows = this._computeRows(this.store.state);
    const index = rows.findIndex(
      (row) => row.kind === 'item' && !row.item.disabled && row.item.label.toLowerCase().startsWith(buffer),
    );
    if (index !== -1) {
      const id = rows[index].item.id;
      this.store.setStateSync({ activeId: id });
      this.renderer.setActive(id, 'auto');
    }
  }

  _activateFirstMatch() {
    const rows = this._computeRows(this.store.state);
    const count = rows.filter((row) => row.kind === 'item').length;
    const index = firstSelectableIndex(rows);
    const id = index !== -1 ? rows[index].item.id : null;
    this.store.setState({ activeId: id });
    this.renderer.announce(count === 0 ? 'No results' : `${count} result${count === 1 ? '' : 's'} available`);
  }

  _moveActive(step) {
    const rows = this._computeRows(this.store.state);
    const currentIndex = rows.findIndex((row) => row.kind === 'item' && row.item.id === this.store.get('activeId'));
    const nextIndex = firstSelectableIndex(rows, currentIndex, step);
    if (nextIndex === -1) return;
    const id = rows[nextIndex].item.id;
    this.store.setStateSync({ activeId: id });
    this.renderer.setActive(id, step > 0 ? 'end' : 'start');
  }

  _moveActiveToEdge(edge) {
    const rows = this._computeRows(this.store.state);
    const index = edge === 'start' ? firstSelectableIndex(rows, -1, 1) : firstSelectableIndex(rows, rows.length, -1);
    if (index === -1) return;
    const id = rows[index].item.id;
    this.store.setStateSync({ activeId: id });
    this.renderer.setActive(id, edge);
  }

  _movePage(direction) {
    const rows = this._computeRows(this.store.state);
    const currentIndex = rows.findIndex((row) => row.kind === 'item' && row.item.id === this.store.get('activeId'));
    const target = Math.max(0, Math.min(rows.length - 1, (currentIndex === -1 ? 0 : currentIndex) + direction * PAGE_STEP));
    let index = firstSelectableIndex(rows, target - 1, 1);
    if (index === -1 || Math.abs(index - target) > PAGE_STEP) {
      index = direction > 0 ? firstSelectableIndex(rows, rows.length, -1) : firstSelectableIndex(rows, -1, 1);
    }
    if (index === -1) return;
    const id = rows[index].item.id;
    this.store.setStateSync({ activeId: id });
    this.renderer.setActive(id, direction > 0 ? 'end' : 'start');
  }

  _selectActive() {
    if (!this.store.get('open')) {
      this.open();
      return;
    }
    const activeId = this.store.get('activeId');
    if (!activeId) {
      const query = this.store.get('query');
      if (query) this.events.emit('enterNoMatch', { query });
      return;
    }
    this._handleRowClick(activeId);
  }

  _handleRowClick(itemId) {
    if (this.presentation === 'chips' && this.selectedSet.has(itemId)) {
      this.deselect(itemId);
      this.setActive(itemId);
      return;
    }
    if (this.multiple) {
      if (this.selectedSet.has(itemId)) this.deselect(itemId);
      else this.select(itemId);
      this.setActive(itemId);
      this.dom.input.focus();
    } else {
      this.select(itemId);
    }
  }

  _clearQuery() {
    this.dom.input.value = '';
    this.store.setState({ query: '', isTyping: false, activeId: null });
    if (this.remote) this.asyncLoader.request('', { page: 1, append: false });
  }

  // ----------------------------------------------------------- selection

  _resolveItem(value) {
    if (value == null) return null;
    if (typeof value === 'object') return value;
    return this.store.getItem(value) ?? this.store.findItemByValue(value);
  }

  _setSelectedIds(ids, { silent = false } = {}) {
    this.selectedSet = new Set(ids);
    this.store.setState({ selected: ids });
    this._syncNativeSelect();
    if (!silent) this.renderer.announce(this._selectionSummary());
  }

  _selectionSummary() {
    const count = this.store.get('selected').length;
    if (!this.multiple) {
      const item = this.store.getItem(this.store.get('selected')[0]);
      return item ? `${item.label} selected` : 'Selection cleared';
    }
    return count === 0 ? 'Selection cleared' : `${count} item${count === 1 ? '' : 's'} selected`;
  }

  _syncNativeSelect() {
    if (!this.isNativeSelect) return;
    const selectedValues = new Set([...this.selectedSet].map((id) => this.store.getItem(id)?.value));
    for (const optionEl of this.el.options) {
      optionEl.selected = selectedValues.has(optionEl.value);
    }
    this.el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  _emitChange() {
    this.events.emit('change', { value: this.getValue() });
  }

  select(value) {
    const item = this._resolveItem(value);
    if (!item || item.disabled || this.store.get('disabled')) return;
    if (this.selectedSet.has(item.id)) return;
    const selected = this.multiple ? [...this.store.get('selected'), item.id] : [item.id];
    this._setSelectedIds(selected);
    this.events.emit('select', { value: item.value, item });
    this._emitChange();
    if (this.multiple) this._clearQuery();
    else if (this.presentation !== 'accordion') this.close();
  }

  deselect(value) {
    const item = this._resolveItem(value);
    if (!item || !this.selectedSet.has(item.id)) return;
    const selected = this.store.get('selected').filter((id) => id !== item.id);
    this._setSelectedIds(selected);
    this.events.emit('deselect', { value: item.value, item });
    this._emitChange();
  }

  setActive(itemId) {
    if (this.store.get('activeId') === itemId) return;
    this.store.setState({ activeId: itemId });
  }

  toggleGroup(groupId) {
    const group = this.store.getGroup(groupId);
    if (!group || group.disabled) return;
    group.collapsed = !group.collapsed;
    this.store.setState({ groups: [...this.store.get('groups')] });
  }

  clear() {
    if (!this.store.get('selected').length) return;
    this._setSelectedIds([]);
    this.events.emit('clear');
    this._emitChange();
  }

  setValue(value) {
    this._applyInitialSelection(value);
    this._emitChange();
  }

  getValue() {
    const items = this.store.get('selected').map((id) => this.store.getItem(id)).filter(Boolean);
    if (this.multiple) return items.map((item) => item.value);
    return items[0]?.value ?? null;
  }

  // -------------------------------------------------------------- data

  setCollections(items, groups, { preserveSelection = true } = {}) {
    // Selection is preserved by VALUE, not by internal item id — normalize
    // assigns fresh ids on every pass, so replacing the collections with
    // identical data (the idiomatic setOptions() call from a reactive
    // framework re-render) would otherwise silently wipe the selection.
    const prevValues = preserveSelection
      ? this.store
          .get('selected')
          .map((id) => this.store.getItem(id)?.value)
          .filter((value) => value !== undefined)
      : [];
    this.store.setCollections(items, groups);
    if (!preserveSelection) return;
    const nextIds = [];
    for (const value of prevValues) {
      const match = this.store.findItemByValue(value);
      if (match && !nextIds.includes(match.id)) nextIds.push(match.id);
    }
    this._setSelectedIds(nextIds, { silent: true });
  }

  setOptions(rawList) {
    const { items, groups } = normalizeFromArray(rawList);
    this.setCollections(items, groups, { preserveSelection: true });
  }

  addOption(option, groupId = null) {
    const raw = option && typeof option === 'object' ? option : { value: option };
    const item = createItem(raw.value, raw.label, raw);
    item.groupId = groupId;
    item.disabled = !!raw.disabled;
    this.setCollections([...this.store.get('items'), item], this.store.get('groups'));
    return item;
  }

  removeOption(value) {
    const item = this.store.findItemByValue(value);
    if (!item) return;
    this.setCollections(
      this.store.get('items').filter((i) => i.id !== item.id),
      this.store.get('groups'),
    );
    if (this.selectedSet.has(item.id)) this.deselect(item.id);
  }

  getOptions() {
    return this.store.get('items');
  }

  findOption(value) {
    return this.store.findItemByValue(value);
  }

  getGroups() {
    return this.store.get('groups');
  }

  getState() {
    return this.store.state;
  }

  refresh() {
    this.store.setState({});
  }

  // ------------------------------------------------------------- lifecycle

  open() {
    if (this.store.get('disabled') || this.store.get('open')) return;
    let activeId = this.store.get('activeId');
    // Persistent presentations are already visible. Do not paint their first
    // option as keyboard-active before the user has interacted with the list;
    // ArrowDown/ArrowUp will establish an active option when needed.
    if (!activeId && !this.persistent) {
      const rows = this._computeRows(this.store.state);
      const index = firstSelectableIndex(rows);
      activeId = index !== -1 ? rows[index].item.id : null;
    }
    this.store.setStateSync({ open: true, activeId });
    this.renderer.open();
    this.renderer.setActive(activeId, 'auto');
    this.events.emit('open');
  }

  close() {
    if (this.persistent) return;
    if (!this.store.get('open')) return;
    this.store.setStateSync({ open: false, isTyping: false, query: '', activeId: null });
    this.dom.input.value = '';
    this.renderer.close();
    this.events.emit('close');
  }

  toggle() {
    if (this.store.get('open')) this.close();
    else this.open();
  }

  enable() {
    this.store.setStateSync({ disabled: false });
    if (this.isNativeSelect) this.el.disabled = false;
  }

  disable() {
    this.store.setStateSync({ disabled: true });
    if (this.isNativeSelect) this.el.disabled = true;
    this.close();
  }

  setDisabled(disabled) {
    if (disabled) this.disable();
    else this.enable();
  }

  setTheme(theme) {
    this.options.theme = theme;
    this.renderer.setTheme(theme);
  }

  focus() {
    this.dom.input.focus();
  }

  blur() {
    this.dom.input.blur();
  }

  on(event, handler) {
    return this.events.on(event, handler);
  }

  off(event, handler) {
    this.events.off(event, handler);
  }

  emit(event, payload) {
    this.events.emit(event, payload);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    document.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
    this.keyboard.destroy();
    this.asyncLoader?.destroy();
    for (const plugin of this.plugins) plugin.destroy?.(this);
    this.renderer.destroy();
    this.store.destroy();
    if (this.isNativeSelect) {
      this.el.style.display = '';
      this.el.removeAttribute('aria-hidden');
      this.el.tabIndex = 0;
    }
    this.events.emit('destroy');
    this.events.removeAllListeners();
  }
}
