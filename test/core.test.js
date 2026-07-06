import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Glide } from '../src/core/Glide.js';

function mountSelect(html) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.querySelector('select');
}

let select;
let instance;

afterEach(() => {
  instance?.destroy();
  select?.closest('div')?.remove();
  document.querySelectorAll('.glide-dropdown').forEach((el) => el.remove());
});

describe('Glide: single select from native <select>', () => {
  beforeEach(() => {
    select = mountSelect(`
      <select>
        <option value="">Choose a country</option>
        <option value="au">Australia</option>
        <option value="at" selected>Austria</option>
        <option value="us" disabled>United States</option>
      </select>
    `);
    instance = new Glide(select);
  });

  it('hides the native select and reads its initial selection', () => {
    expect(select.style.display).toBe('none');
    expect(instance.getValue()).toBe('at');
  });

  it('derives a placeholder from an empty leading option', () => {
    expect(instance.options.placeholder).toBe('Choose a country');
  });

  it('select() changes the value and fires change/select events', () => {
    const onChange = vi.fn();
    const onSelect = vi.fn();
    instance.on('change', onChange);
    instance.on('select', onSelect);

    instance.select('au');

    expect(instance.getValue()).toBe('au');
    expect(onChange).toHaveBeenCalledWith({ value: 'au' });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('refuses to select a disabled option', () => {
    instance.select('us');
    expect(instance.getValue()).toBe('at');
  });

  it('syncs selection back onto the native <select> element', () => {
    instance.select('au');
    expect(select.value).toBe('au');
  });

  it('clear() empties the selection and fires clear + change', () => {
    const onClear = vi.fn();
    instance.on('clear', onClear);
    instance.clear();
    expect(instance.getValue()).toBeNull();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('open()/close() toggle dropdown visibility', () => {
    expect(instance.dom.dropdown.hidden).toBe(true);
    instance.open();
    expect(instance.dom.dropdown.hidden).toBe(false);
    instance.close();
    expect(instance.dom.dropdown.hidden).toBe(true);
  });

  it('disable() closes the dropdown and blocks selection', () => {
    instance.open();
    instance.disable();
    expect(instance.dom.dropdown.hidden).toBe(true);
    instance.select('au');
    expect(instance.getValue()).toBe('at');
  });
});

describe('Glide: multi select', () => {
  beforeEach(() => {
    select = mountSelect(`
      <select multiple>
        <option value="a">Alpha</option>
        <option value="b">Beta</option>
        <option value="c">Gamma</option>
      </select>
    `);
    instance = new Glide(select);
  });

  it('accumulates selections in order', () => {
    instance.select('b');
    instance.select('a');
    expect(instance.getValue()).toEqual(['b', 'a']);
  });

  it('deselect() removes a single value without touching the rest', () => {
    instance.select('a');
    instance.select('b');
    instance.deselect('a');
    expect(instance.getValue()).toEqual(['b']);
  });

  it('setValue() replaces the whole selection', () => {
    instance.select('a');
    instance.setValue(['b', 'c']);
    expect(instance.getValue()).toEqual(['b', 'c']);
  });

  it('keeps the input focused across a selection-triggered re-render', () => {
    instance.dom.input.focus();
    expect(document.activeElement).toBe(instance.dom.input);
    instance.select('a'); // rebuilds the tag list synchronously
    expect(document.activeElement).toBe(instance.dom.input);
  });

  it('keeps the input focused while typing (regression: tag-list rebuild used to steal focus)', async () => {
    instance.dom.input.focus();
    instance.dom.input.value = 'a';
    instance.dom.input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve(); // let the batched store update flush and re-render
    expect(document.activeElement).toBe(instance.dom.input);
  });
});

describe('Glide: data-driven (array) source', () => {
  beforeEach(() => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    select = div;
    instance = new Glide(div, {
      options: [
        { label: 'Fruit', options: [{ value: 1, label: 'Apple' }, { value: 2, label: 'Banana' }] },
        { value: 3, label: 'Carrot' },
      ],
    });
  });

  it('normalizes nested groups and flat entries', () => {
    const items = instance.getOptions();
    expect(items.map((i) => i.label)).toEqual(['Apple', 'Banana', 'Carrot']);
    expect(instance.getGroups()).toHaveLength(1);
  });

  it('selects by value even though the source was an array', () => {
    instance.select(2);
    expect(instance.getValue()).toBe('2');
  });
});

describe('Glide: array options targeting an empty native <select> (progressive enhancement)', () => {
  it('uses the options array instead of ignoring it because the target is a <select>', () => {
    const select = document.createElement('select');
    document.body.appendChild(select);
    const instance = new Glide(select, {
      options: [
        { value: 'p1', label: 'Priya' },
        { value: 'p2', label: 'Marcus' },
      ],
    });

    expect(instance.getOptions().map((i) => i.label)).toEqual(['Priya', 'Marcus']);

    instance.select('p2');
    expect(instance.getValue()).toBe('p2');

    // and the native <select> itself should now carry matching <option>s,
    // so a real <form> submit still posts the right value.
    expect([...select.options].map((o) => o.value)).toEqual(['p1', 'p2']);
    expect(select.value).toBe('p2');

    instance.destroy();
    select.remove();
  });

  it('still prefers existing markup when a native <select> already has options', () => {
    const select = document.createElement('select');
    select.innerHTML = '<option value="x">Xavier</option>';
    document.body.appendChild(select);
    const instance = new Glide(select, { options: [{ value: 'ignored', label: 'Ignored' }] });

    expect(instance.getOptions().map((i) => i.value)).toEqual(['x']);

    instance.destroy();
    select.remove();
  });
});

describe('Glide: addOption / removeOption / setOptions', () => {
  beforeEach(() => {
    select = mountSelect(`<select><option value="a">Alpha</option></select>`);
    instance = new Glide(select);
  });

  it('addOption appends a new selectable item', () => {
    instance.addOption({ value: 'z', label: 'Zulu' });
    expect(instance.getOptions().map((i) => i.value)).toContain('z');
    instance.select('z');
    expect(instance.getValue()).toBe('z');
  });

  it('removeOption drops the item and deselects it if selected', () => {
    instance.select('a');
    instance.removeOption('a');
    expect(instance.getOptions()).toHaveLength(0);
    expect(instance.getValue()).toBeNull();
  });

  it('setOptions replaces the whole dataset', () => {
    instance.setOptions([{ value: 'x', label: 'X-ray' }]);
    expect(instance.getOptions().map((i) => i.value)).toEqual(['x']);
  });
});

describe('Glide: 0.2.0 — setOptions preserves selection by value', () => {
  beforeEach(() => {
    select = mountSelect('<select></select>');
    instance = new Glide(select, {
      options: [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
      ],
    });
  });

  it('keeps the current selection when setOptions() is called with identical data', () => {
    instance.select(instance.findOption('b').id);
    expect(instance.getValue()).toBe('b');

    // Fresh array, fresh internal ids — the idiomatic reactive re-render call.
    instance.setOptions([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);

    expect(instance.getValue()).toBe('b');
  });

  it('keeps the selection when the list grows around it', () => {
    instance.select(instance.findOption('a').id);
    instance.setOptions([
      { value: 'z', label: 'Zeta' },
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    expect(instance.getValue()).toBe('a');
  });

  it('drops the selection when its value is no longer in the list', () => {
    instance.select(instance.findOption('a').id);
    instance.setOptions([{ value: 'b', label: 'Beta' }]);
    expect(instance.getValue()).toBe(null);
  });

  it('does not emit change while preserving', () => {
    instance.select(instance.findOption('a').id);
    const onChange = vi.fn();
    instance.on('change', onChange);
    instance.setOptions([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('Glide: 0.2.0 — control/dropdown class options + portal', () => {
  beforeEach(() => {
    select = mountSelect('<select><option value="a">Alpha</option></select>');
  });

  it('controlClassName / dropdownClassName land on their elements', () => {
    instance = new Glide(select, {
      className: 'my-root',
      controlClassName: 'my-control hook-1',
      dropdownClassName: 'my-panel hook-1',
    });
    expect(instance.dom.root.classList.contains('my-root')).toBe(true);
    expect(instance.dom.control.classList.contains('my-control')).toBe(true);
    expect(instance.dom.control.classList.contains('hook-1')).toBe(true);
    expect(instance.dom.dropdown.classList.contains('my-panel')).toBe(true);
    expect(instance.dom.dropdown.classList.contains('hook-1')).toBe(true);
  });

  it('portals the panel to <body> by default', () => {
    instance = new Glide(select);
    expect(instance.dom.dropdown.parentElement).toBe(document.body);
  });

  it('portal:false keeps the panel inside the root', () => {
    instance = new Glide(select, { portal: false });
    expect(instance.dom.root.contains(instance.dom.dropdown)).toBe(true);
  });

  it('portal:Element appends the panel to that element', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    instance = new Glide(select, { portal: host });
    expect(instance.dom.dropdown.parentElement).toBe(host);
    instance.destroy();
    instance = null;
    host.remove();
  });
});
