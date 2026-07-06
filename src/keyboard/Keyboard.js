/**
 * Translates keydown events into abstract intents. Knows nothing about
 * selection state, rendering, or DOM structure — it just decides "what was
 * the user asking for" and calls the matching handler. This keeps key
 * bindings in one place and testable without a full Glide instance.
 */
const HANDLED_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'Enter',
  'Escape',
  'Tab',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backspace',
  'Delete',
]);

export class Keyboard {
  constructor(target, handlers) {
    this.target = target;
    this.handlers = handlers;
    this._onKeydown = (event) => this.handleKeydown(event);
    target.addEventListener('keydown', this._onKeydown);
  }

  handleKeydown(event) {
    const { key } = event;
    const h = this.handlers;

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        h.onArrowDown?.(event);
        break;
      case 'ArrowUp':
        event.preventDefault();
        h.onArrowUp?.(event);
        break;
      case 'Enter':
        event.preventDefault();
        h.onEnter?.(event);
        break;
      case 'Escape':
        h.onEscape?.(event);
        break;
      case 'Tab':
        h.onTab?.(event);
        break;
      case 'Home':
        if (h.onHome) {
          event.preventDefault();
          h.onHome(event);
        }
        break;
      case 'End':
        if (h.onEnd) {
          event.preventDefault();
          h.onEnd(event);
        }
        break;
      case 'PageUp':
        if (h.onPageUp) {
          event.preventDefault();
          h.onPageUp(event);
        }
        break;
      case 'PageDown':
        if (h.onPageDown) {
          event.preventDefault();
          h.onPageDown(event);
        }
        break;
      case 'Backspace':
        h.onBackspace?.(event);
        break;
      case 'Delete':
        h.onDelete?.(event);
        break;
      default:
        break;
    }

    if (!HANDLED_KEYS.has(key)) h.onPrintableKey?.(event);
  }

  destroy() {
    this.target.removeEventListener('keydown', this._onKeydown);
  }
}
