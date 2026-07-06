import { h, setAttr, empty } from '../utils/dom.js';
import { VirtualList } from '../virtual/VirtualList.js';

const ITEM_ROLE = 'option';

/**
 * Renders the (virtualized) option list. Owns the mapping from row index to
 * DOM node lifecycle; all selection/active/template state lives in the
 * closures below so VirtualList can call `renderRow` without knowing
 * anything about options, groups, or templates.
 */
export class ListRenderer {
  constructor({
    viewport,
    content,
    listboxId,
    rowHeight = 36,
    groupRowHeight = 32,
    templates,
    getOptionId,
    onHoverItem,
    onSelectItem,
    onToggleGroup,
  }) {
    this.rowHeight = rowHeight;
    this.groupRowHeight = groupRowHeight;
    this.templates = templates;
    this.getOptionId = getOptionId;
    this.onHoverItem = onHoverItem;
    this.onSelectItem = onSelectItem;
    this.onToggleGroup = onToggleGroup;

    this.rows = [];
    this.activeId = null;
    this.selectedSet = new Set();

    this.listbox = content;
    setAttr(this.listbox, 'role', 'listbox');
    setAttr(this.listbox, 'id', listboxId);

    this.virtualList = new VirtualList({
      viewport,
      content,
      rowHeight,
      renderRow: (index, el) => this._renderRow(index, el),
    });

    this._onClick = (event) => this._handleClick(event);
    this._onMouseMove = (event) => this._handleMouseMove(event);
    content.addEventListener('click', this._onClick);
    content.addEventListener('mousemove', this._onMouseMove);
  }

  setRows(rows, { activeId, selectedSet, multiple }) {
    this.rows = rows;
    this.activeId = activeId;
    this.selectedSet = selectedSet;
    this.multiple = multiple;
    this.virtualList.setCount(rows.length, (index) =>
      rows[index].kind === 'group' ? this.groupRowHeight : this.rowHeight,
    );
  }

  setActive(activeId) {
    this.activeId = activeId;
    this.virtualList.update();
  }

  setSelected(selectedSet) {
    this.selectedSet = selectedSet;
    this.virtualList.update();
  }

  indexOfItem(itemId) {
    return this.rows.findIndex((row) => row.kind === 'item' && row.item.id === itemId);
  }

  scrollToActive(align) {
    const index = this.indexOfItem(this.activeId);
    if (index !== -1) this.virtualList.scrollToIndex(index, align);
  }

  isNearBottom(threshold) {
    return this.virtualList.isNearBottom(threshold);
  }

  _renderRow(index, el) {
    const row = this.rows[index];
    if (!row) return null;

    if (row.kind === 'group') {
      if (!el || el.dataset.rowKind !== 'group') el = this._buildGroupRow();
      this._fillGroupRow(el, row.group);
      return el;
    }

    if (!el || el.dataset.rowKind !== 'item') el = this._buildItemRow();
    this._fillItemRow(el, row);
    return el;
  }

  _buildGroupRow() {
    const el = h('div', { class: 'glide-group', dataset: { rowKind: 'group' }, role: 'presentation' });
    el.appendChild(h('span', { class: 'glide-group-label' }));
    return el;
  }

  _fillGroupRow(el, group) {
    el.dataset.groupId = group.id;
    setAttr(el, 'aria-disabled', group.disabled || null);
    el.classList.toggle('is-disabled', !!group.disabled);
    el.classList.toggle('is-collapsed', !!group.collapsed);
    el.firstChild.innerHTML = this.templates.group(group);
  }

  _buildItemRow() {
    const el = h('div', {
      class: 'glide-option',
      dataset: { rowKind: 'item' },
      role: ITEM_ROLE,
    });
    el.appendChild(h('span', { class: 'glide-option-content' }));
    return el;
  }

  _fillItemRow(el, row) {
    const { item, ranges } = row;
    const selected = this.selectedSet.has(item.id);
    const active = this.activeId === item.id;

    el.id = this.getOptionId(item.id);
    el.dataset.itemId = item.id;
    setAttr(el, 'aria-selected', selected);
    setAttr(el, 'aria-disabled', item.disabled || null);
    el.classList.toggle('is-selected', selected);
    el.classList.toggle('is-active', active);
    el.classList.toggle('is-disabled', !!item.disabled);
    el.classList.toggle('is-multiple', !!this.multiple);
    el.firstChild.innerHTML = this.templates.option(item, { ranges, selected });
  }

  _handleClick(event) {
    const groupEl = event.target.closest('.glide-group');
    if (groupEl) {
      this.onToggleGroup?.(groupEl.dataset.groupId);
      return;
    }
    const itemEl = event.target.closest('.glide-option');
    if (itemEl && !itemEl.classList.contains('is-disabled')) {
      this.onSelectItem?.(itemEl.dataset.itemId);
    }
  }

  _handleMouseMove(event) {
    const itemEl = event.target.closest('.glide-option');
    if (itemEl && !itemEl.classList.contains('is-disabled') && itemEl.dataset.itemId !== this.activeId) {
      this.onHoverItem?.(itemEl.dataset.itemId);
    }
  }

  destroy() {
    this.listbox.removeEventListener('click', this._onClick);
    this.listbox.removeEventListener('mousemove', this._onMouseMove);
    this.virtualList.destroy();
    empty(this.listbox);
  }
}
