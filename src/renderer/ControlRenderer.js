import { h, setAttr, empty } from '../utils/dom.js';
import { escapeHtml } from '../utils/escapeHtml.js';

/**
 * Renders the always-visible control (the box that replaces the native
 * <select>). The root nodes are created once and kept stable for the life
 * of the instance — plugins grab a reference to `instance.dom.control` in
 * their `init()` and can rely on it never being replaced. Only the
 * value/tags contents are diffed in place on each update.
 */
export class ControlRenderer {
  constructor({ multiple, searchable, placeholder, templates, comboboxId, listboxId }) {
    this.multiple = multiple;
    this.searchable = searchable;
    this.placeholder = placeholder;
    this.templates = templates;

    this.value = h('span', { class: 'glide-value' });
    this.tags = h('ul', { class: 'glide-tags', role: 'presentation' });
    this.input = h('input', {
      class: `glide-input${searchable ? '' : ' glide-input--visually-hidden'}`,
      type: 'text',
      id: comboboxId,
      role: 'combobox',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: false,
      'aria-expanded': 'false',
      'aria-haspopup': 'listbox',
      'aria-controls': listboxId,
      'aria-autocomplete': searchable ? 'list' : 'none',
    });
    this.caret = h('span', { class: 'glide-caret', 'aria-hidden': 'true' });

    this.control = h('div', { class: 'glide-control' }, [
      this.multiple ? this.tags : this.value,
      this.input,
      this.caret,
    ]);

    if (this.multiple) this.tags.appendChild(h('li', { class: 'glide-tag-input-wrap' }, this.input));
  }

  render(selectedItems, { query, isTyping }) {
    if (this.multiple) {
      this._renderTags(selectedItems);
      this.input.placeholder = selectedItems.length === 0 ? this.placeholder ?? '' : '';
    } else {
      const showQuery = isTyping;
      this.value.style.display = showQuery ? 'none' : '';
      // Toggling only `width` left the input's `flex: 1 1 auto` still
      // competing for growable space against .glide-value, so its (empty,
      // invisible) box — and thus the text caret — ended up sitting well
      // into the middle of the control instead of collapsing away.
      this.input.classList.toggle('glide-input--collapsed', !showQuery);
      if (!showQuery) {
        const item = selectedItems[0];
        this.value.innerHTML = item ? this.templates.value(item) : escapeHtml(this.placeholder ?? '');
        this.value.classList.toggle('is-placeholder', !item);
      }
    }
  }

  _renderTags(selectedItems) {
    const wrap = this.tags.querySelector('.glide-tag-input-wrap');
    // Remove only the tag pills, never `wrap` — it holds the live <input>,
    // and detaching a focused element from the DOM (as a naive empty() +
    // rebuild would) knocks focus to <body> and doesn't restore it, which
    // used to break typing after the very first keystroke.
    for (const child of [...this.tags.children]) {
      if (child !== wrap) child.remove();
    }
    for (const item of selectedItems) {
      const remove = h('button', {
        type: 'button',
        class: 'glide-tag-remove',
        'aria-label': `Remove ${item.label}`,
        dataset: { itemId: item.id },
      }, '×');
      const tag = h('li', { class: 'glide-tag', dataset: { itemId: item.id } });
      tag.innerHTML = this.templates.tag(item);
      tag.appendChild(remove);
      this.tags.insertBefore(tag, wrap);
    }
  }

  setExpanded(expanded, activeDescendantId) {
    // aria-expanded must always be present as an explicit "true"/"false" —
    // unlike other aria-* attrs, removing it (setAttr's usual falsy
    // behavior) means "not expandable" to assistive tech, not "collapsed".
    this.input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    setAttr(this.input, 'aria-activedescendant', expanded ? activeDescendantId : null);
  }

  setDisabled(disabled) {
    this.input.disabled = disabled;
    this.control.classList.toggle('is-disabled', disabled);
  }

  destroy() {
    empty(this.control);
  }
}
