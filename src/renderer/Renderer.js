import { h, setAttr, empty } from '../utils/dom.js';
import { raf, caf } from '../utils/debounce.js';
import { ControlRenderer } from './ControlRenderer.js';
import { ListRenderer } from './ListRenderer.js';

const DEFAULT_MAX_HEIGHT = 280;

/**
 * Top-level DOM orchestrator: owns the root wrapper, the always-visible
 * control, and the dropdown panel (positioned in the body so it can escape
 * `overflow: hidden` ancestors like modals). Delegates option-list rendering
 * to ListRenderer and control rendering to ControlRenderer.
 */
export class Renderer {
  constructor({ anchor, multiple, searchable, placeholder, theme, presentation = 'dropdown', showSelectedChips = true, staticControlLabel, panelLabel, templates, ids, portal = true, onHoverItem, onSelectItem, onToggleGroup }) {
    this.anchor = anchor;
    this.ids = ids;
    this.theme = theme;
    this.presentation = presentation;
    this.inline = presentation === 'chips' || presentation === 'always-open' || presentation === 'accordion';
    this.portal = this.inline ? false : portal;

    this.controlRenderer = new ControlRenderer({
      multiple,
      searchable,
      placeholder,
      showSelectedChips,
      staticControlLabel,
      templates,
      comboboxId: ids.combobox,
      listboxId: ids.listbox,
    });

    this.statusEl = h('div', {
      class: 'glide-sr-only',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    });

    this.panelHeader = panelLabel
      ? h('div', { class: 'glide-panel-header' }, panelLabel)
      : null;
    this.messageEl = h('div', { class: 'glide-message', hidden: true });
    this.content = h('div', { class: 'glide-content' });
    this.viewport = h('div', { class: 'glide-viewport' }, this.content);
    this.dropdown = h(
      'div',
      { class: 'glide-dropdown', id: ids.dropdown, hidden: true, dataset: { theme, presentation } },
      [this.panelHeader, this.messageEl, this.viewport].filter(Boolean),
    );

    this.root = h('div', { class: 'glide', dataset: { theme, presentation } }, [this.controlRenderer.control, this.statusEl]);

    this.listRenderer = new ListRenderer({
      viewport: this.viewport,
      content: this.content,
      listboxId: ids.listbox,
      templates,
      getOptionId: (itemId) => `${ids.listbox}-opt-${itemId}`,
      onHoverItem,
      onSelectItem,
      onToggleGroup,
      layout: presentation === 'chips' || presentation === 'popup' ? 'static' : 'virtual',
    });

    this.templates = templates;
    this._reposition = () => this._scheduleReposition();
    this._rafId = null;
    this.isOpen = false;
  }

  mount() {
    this.anchor.after(this.root);
    // Where the panel lives (see the `portal` option): <body> by default to
    // escape overflow/stacking contexts; inside the root for scoped CSS /
    // focus traps / shadow DOM; or any custom container element. Positioning
    // is viewport-fixed either way.
    if (this.portal === false) {
      this.root.appendChild(this.dropdown);
    } else if (this.portal && this.portal !== true && typeof this.portal.appendChild === 'function') {
      this.portal.appendChild(this.dropdown);
    } else {
      document.body.appendChild(this.dropdown);
    }
    if (this.inline) this.dropdown.hidden = false;
    if (this.presentation === 'accordion') {
      this.dropdown.setAttribute('aria-hidden', 'true');
      this.dropdown.setAttribute('inert', '');
    }
  }

  get input() {
    return this.controlRenderer.input;
  }

  get control() {
    return this.controlRenderer.control;
  }

  renderControl(selectedItems, extra) {
    this.controlRenderer.render(selectedItems, extra);
  }

  setDisabled(disabled) {
    this.controlRenderer.setDisabled(disabled);
  }

  setTheme(theme) {
    this.theme = theme;
    this.root.dataset.theme = theme;
    this.dropdown.dataset.theme = theme;
  }

  setRows(rows, state) {
    this.listRenderer.setRows(rows, state);
    const showMessage = rows.length === 0 && !state.loading;
    this.messageEl.hidden = !showMessage && !state.loading;
    if (state.loading) {
      this.messageEl.innerHTML = this.templates.loading();
    } else if (showMessage) {
      this.messageEl.innerHTML = this.templates.noResults(state.query);
    }
  }

  setActive(activeId, align) {
    this.listRenderer.setActive(activeId);
    if (this.isOpen) {
      this.controlRenderer.setExpanded(true, activeId ? this.listRenderer.getOptionId(activeId) : null);
    }
    if (align) this.listRenderer.scrollToActive(align);
  }

  getOptionId(itemId) {
    return this.listRenderer.getOptionId(itemId);
  }

  setSelected(selectedSet) {
    this.listRenderer.setSelected(selectedSet);
  }

  announce(message) {
    this.statusEl.textContent = message;
  }

  open() {
    this.isOpen = true;
    this.dropdown.hidden = false;
    this.root.classList.add('is-open');
    this.controlRenderer.setExpanded(true, null);
    if (this.presentation === 'accordion') {
      this.dropdown.removeAttribute('aria-hidden');
      this.dropdown.removeAttribute('inert');
    }
    if (!this.inline) {
      this._position();
      window.addEventListener('scroll', this._reposition, true);
      window.addEventListener('resize', this._reposition);
    }
  }

  close() {
    this.isOpen = false;
    this.dropdown.hidden = this.presentation !== 'accordion';
    this.root.classList.remove('is-open');
    this.controlRenderer.setExpanded(false, null);
    if (this.presentation === 'accordion') {
      // Keep the element mounted for its closing animation, but make the
      // collapsed list unavailable to keyboard and assistive-technology users.
      this.dropdown.setAttribute('aria-hidden', 'true');
      this.dropdown.setAttribute('inert', '');
    }
    window.removeEventListener('scroll', this._reposition, true);
    window.removeEventListener('resize', this._reposition);
    if (this._rafId != null) {
      caf(this._rafId);
      this._rafId = null;
    }
  }

  _scheduleReposition() {
    if (this._rafId != null) return;
    this._rafId = raf(() => {
      this._rafId = null;
      this._position();
    });
  }

  _position() {
    const rect = this.control.getBoundingClientRect();
    // Theme-level cap: --glide-panel-max-h (a px length on the dropdown, via
    // its theme/instance classes) lowers the default 280px ceiling — the
    // available-viewport-space clamp below still applies on top of it.
    const varCap = parseFloat(getComputedStyle(this.dropdown).getPropertyValue('--glide-panel-max-h'));
    const maxHeight = Number.isFinite(varCap) && varCap > 0 ? varCap : DEFAULT_MAX_HEIGHT;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < maxHeight && spaceAbove > spaceBelow;

    const popup = this.presentation === 'popup';
    const popupVar = parseFloat(getComputedStyle(this.dropdown).getPropertyValue('--glide-popup-width'));
    const desiredWidth = popup ? (Number.isFinite(popupVar) && popupVar > 0 ? popupVar : 720) : rect.width;
    const width = Math.min(desiredWidth, window.innerWidth - 24);
    const left = popup
      ? Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2))
      : rect.left;
    const panelGap = popup ? 12 : 0;

    this.dropdown.style.left = `${left}px`;
    this.dropdown.style.width = `${width}px`;
    if (popup) {
      this.dropdown.style.setProperty('--glide-popup-anchor-x', `${Math.max(18, Math.min(width - 18, rect.left + rect.width / 2 - left))}px`);
    }
    this.viewport.style.maxHeight = `${Math.min(maxHeight, Math.max(120, (openUpward ? spaceAbove : spaceBelow) - 12))}px`;

    if (openUpward) {
      this.dropdown.style.top = 'auto';
      this.dropdown.style.bottom = `${window.innerHeight - rect.top + panelGap}px`;
      this.dropdown.classList.add('is-flipped');
      this.root.classList.add('is-flipped');
    } else {
      this.dropdown.style.bottom = 'auto';
      this.dropdown.style.top = `${rect.bottom + panelGap}px`;
      this.dropdown.classList.remove('is-flipped');
      this.root.classList.remove('is-flipped');
    }
  }

  destroy() {
    this.close();
    this.listRenderer.destroy();
    this.controlRenderer.destroy();
    this.root.remove();
    this.dropdown.remove();
  }
}
