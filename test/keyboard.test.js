import { describe, it, expect, vi } from 'vitest';
import { Keyboard } from '../src/keyboard/Keyboard.js';

function fire(target, key, extra) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
  target.dispatchEvent(event);
  return event;
}

describe('Keyboard', () => {
  it('maps navigation keys to handlers and prevents default', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    const handlers = {
      onArrowDown: vi.fn(),
      onArrowUp: vi.fn(),
      onEnter: vi.fn(),
      onEscape: vi.fn(),
      onHome: vi.fn(),
      onEnd: vi.fn(),
      onPageUp: vi.fn(),
      onPageDown: vi.fn(),
      onBackspace: vi.fn(),
      onPrintableKey: vi.fn(),
    };
    const keyboard = new Keyboard(input, handlers);

    const arrowDownEvent = fire(input, 'ArrowDown');
    expect(handlers.onArrowDown).toHaveBeenCalledTimes(1);
    expect(arrowDownEvent.defaultPrevented).toBe(true);

    fire(input, 'ArrowUp');
    expect(handlers.onArrowUp).toHaveBeenCalledTimes(1);

    fire(input, 'Enter');
    expect(handlers.onEnter).toHaveBeenCalledTimes(1);

    fire(input, 'Escape');
    expect(handlers.onEscape).toHaveBeenCalledTimes(1);

    fire(input, 'Home');
    expect(handlers.onHome).toHaveBeenCalledTimes(1);

    fire(input, 'End');
    expect(handlers.onEnd).toHaveBeenCalledTimes(1);

    fire(input, 'PageUp');
    expect(handlers.onPageUp).toHaveBeenCalledTimes(1);

    fire(input, 'PageDown');
    expect(handlers.onPageDown).toHaveBeenCalledTimes(1);

    fire(input, 'Backspace');
    expect(handlers.onBackspace).toHaveBeenCalledTimes(1);

    fire(input, 'a');
    expect(handlers.onPrintableKey).toHaveBeenCalledTimes(1);

    keyboard.destroy();
    fire(input, 'ArrowDown');
    expect(handlers.onArrowDown).toHaveBeenCalledTimes(1); // no further calls after destroy
  });

  it('does not preventDefault for keys without a registered handler', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    new Keyboard(input, {});
    const event = fire(input, 'Home');
    expect(event.defaultPrevented).toBe(false);
  });
});
