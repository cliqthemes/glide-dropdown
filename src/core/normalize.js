import { nextId } from '../utils/dom.js';

/**
 * Internal item shape:
 *   { id, value, label, disabled, groupId, data }
 * Internal group shape:
 *   { id, label, disabled, collapsed }
 *
 * Everything downstream (store, renderer, search, keyboard) only ever deals
 * with this normalized shape, regardless of whether the source was a native
 * <select>, a flat array, or a grouped array.
 */

export function normalizeFromSelect(selectEl) {
  const items = [];
  const groups = [];

  const readOption = (optionEl, groupId) => {
    items.push({
      id: nextId('opt'),
      value: optionEl.value,
      label: optionEl.textContent,
      disabled: optionEl.disabled,
      groupId: groupId ?? null,
      data: { ...optionEl.dataset },
      selected: optionEl.selected,
    });
  };

  for (const child of selectEl.children) {
    if (child.tagName === 'OPTGROUP') {
      const groupId = nextId('grp');
      groups.push({
        id: groupId,
        label: child.label,
        disabled: child.disabled,
        collapsed: false,
      });
      for (const optionEl of child.children) {
        if (optionEl.tagName === 'OPTION') readOption(optionEl, groupId);
      }
    } else if (child.tagName === 'OPTION') {
      readOption(child, null);
    }
  }

  return { items, groups };
}

export function normalizeFromArray(rawList) {
  const items = [];
  const groups = [];

  for (const entry of rawList ?? []) {
    if (entry && Array.isArray(entry.options)) {
      const groupId = entry.id ?? nextId('grp');
      groups.push({
        id: groupId,
        label: entry.label,
        disabled: !!entry.disabled,
        collapsed: !!entry.collapsed,
      });
      for (const opt of entry.options) {
        items.push(normalizeItem(opt, groupId));
      }
    } else {
      items.push(normalizeItem(entry, null));
    }
  }

  return { items, groups };
}

function normalizeItem(raw, groupId) {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: nextId('opt'),
      value: String(raw),
      label: String(raw),
      disabled: false,
      groupId,
      data: {},
    };
  }
  return {
    id: raw.id != null ? String(raw.id) : nextId('opt'),
    value: raw.value != null ? String(raw.value) : String(raw.label ?? ''),
    label: raw.label != null ? String(raw.label) : String(raw.value ?? ''),
    disabled: !!raw.disabled,
    groupId,
    data: raw,
  };
}

/**
 * Mirrors normalized items/groups into real <option>/<optgroup> elements on
 * a native <select>. Used when a <select> target is populated via the
 * `options` array config (rather than pre-existing markup) so the hidden
 * native element still participates correctly in native form submission.
 */
export function populateNativeSelect(selectEl, items, groups) {
  selectEl.textContent = '';
  const groupEls = new Map();
  for (const group of groups) {
    const optgroupEl = document.createElement('optgroup');
    optgroupEl.label = group.label;
    optgroupEl.disabled = group.disabled;
    groupEls.set(group.id, optgroupEl);
    selectEl.appendChild(optgroupEl);
  }
  for (const item of items) {
    const optionEl = document.createElement('option');
    optionEl.value = item.value;
    optionEl.textContent = item.label;
    optionEl.disabled = item.disabled;
    const parent = item.groupId != null ? groupEls.get(item.groupId) : selectEl;
    (parent ?? selectEl).appendChild(optionEl);
  }
}

export function createItem(value, label, extra) {
  return {
    id: nextId('opt'),
    value: String(value),
    label: label != null ? String(label) : String(value),
    disabled: false,
    groupId: null,
    data: extra ?? {},
  };
}
