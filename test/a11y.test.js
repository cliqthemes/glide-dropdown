import { describe, it, expect, afterEach } from 'vitest';
import { Glide } from '../src/core/Glide.js';

let instance;
let container;

afterEach(() => {
  instance?.destroy();
  container?.remove();
  document.querySelectorAll('.glide-dropdown').forEach((el) => el.remove());
});

function makeSelect() {
  container = document.createElement('div');
  container.innerHTML = `
    <select>
      <option value="a">Alpha</option>
      <option value="b">Beta</option>
    </select>
  `;
  document.body.appendChild(container);
  return container.querySelector('select');
}

describe('accessibility', () => {
  it('exposes a combobox with a listbox popup', () => {
    instance = new Glide(makeSelect());
    expect(instance.dom.input.getAttribute('role')).toBe('combobox');
    expect(instance.dom.input.getAttribute('aria-haspopup')).toBe('listbox');
    expect(instance.dom.content.getAttribute('role')).toBe('listbox');
  });

  it('reflects open state via aria-expanded', () => {
    instance = new Glide(makeSelect());
    expect(instance.dom.input.getAttribute('aria-expanded')).toBe('false');
    instance.open();
    expect(instance.dom.input.getAttribute('aria-expanded')).toBe('true');
    instance.close();
    expect(instance.dom.input.getAttribute('aria-expanded')).toBe('false');
  });

  it('points aria-controls at the listbox id', () => {
    instance = new Glide(makeSelect());
    expect(instance.dom.input.getAttribute('aria-controls')).toBe(instance.dom.content.id);
  });

  it('marks the active option via aria-activedescendant while open', () => {
    instance = new Glide(makeSelect());
    instance.open();
    const activeId = instance.getState().activeId;
    const activeDescendant = instance.dom.input.getAttribute('aria-activedescendant');
    expect(activeDescendant).toBe(instance.renderer.getOptionId(activeId));
    const activeEl = document.getElementById(activeDescendant);
    expect(activeEl).not.toBeNull();
    expect(activeEl.getAttribute('role')).toBe('option');
  });

  it('sets aria-selected on the selected option and reflects a disabled control', () => {
    instance = new Glide(makeSelect());
    instance.select('a');
    instance.open();
    const item = instance.findOption('a');
    const optionEl = document.getElementById(instance.renderer.getOptionId(item.id));
    expect(optionEl.getAttribute('aria-selected')).toBe('true');

    instance.disable();
    expect(instance.dom.control.classList.contains('is-disabled')).toBe(true);
    expect(instance.dom.input.disabled).toBe(true);
  });

  it('announces selection changes via a polite live region', () => {
    instance = new Glide(makeSelect());
    expect(instance.dom.root.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
    instance.select('b');
    expect(instance.dom.root.querySelector('[role="status"]').textContent).toMatch(/Beta/);
  });
});
