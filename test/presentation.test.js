import { afterEach, describe, expect, it } from 'vitest';
import { Glide } from '../src/core/Glide.js';
import { checkboxSelection } from '../src/plugins/checkboxSelection.js';

let instance;
let select;

const mount = (multiple = false) => {
  select = document.createElement('select');
  select.multiple = multiple;
  select.innerHTML = [
    '<option value="a">Alpha</option>',
    '<option value="b">Beta</option>',
    '<option value="c">Gamma</option>',
  ].join('');
  document.body.appendChild(select);
  return select;
};

afterEach(() => {
  instance?.destroy();
  select?.remove();
  document.querySelectorAll('.glide-dropdown').forEach((el) => el.remove());
  instance = null;
  select = null;
});

describe('presentation modes', () => {
  it('rejects an unknown presentation instead of silently falling back', () => {
    expect(() => new Glide(mount(), { presentation: 'drawer' })).toThrow(/unknown presentation/);
  });

  it('renders chips as direct choices that toggle on repeated clicks', async () => {
    instance = new Glide(mount(true), { presentation: 'chips', searchable: false });

    expect(instance.dom.root.dataset.presentation).toBe('chips');
    expect(instance.dom.dropdown.dataset.presentation).toBe('chips');
    expect(instance.dom.dropdown.hidden).toBe(false);
    expect(instance.dom.dropdown.parentElement).toBe(instance.dom.root);
    expect(instance.dom.content.querySelectorAll('.glide-option')).toHaveLength(3);
    expect(instance.getState().open).toBe(true);
    expect(instance.dom.control.getBoundingClientRect().width).toBe(0);

    const firstChip = instance.dom.content.querySelector('.glide-option');
    firstChip.click();
    await Promise.resolve();
    expect(instance.getValue()).toEqual(['a']);
    expect(instance.dom.content.querySelector('.glide-option')?.classList.contains('is-selected')).toBe(true);

    instance.dom.content.querySelector('.glide-option')?.click();
    await Promise.resolve();
    expect(instance.getValue()).toEqual([]);

    instance.close();
    expect(instance.getState().open).toBe(true);
  });

  it('lets a single-select chip deselect when clicked again', async () => {
    instance = new Glide(mount(), { presentation: 'chips', searchable: false });
    const secondChip = instance.dom.content.querySelectorAll('.glide-option')[1];

    secondChip.click();
    await Promise.resolve();
    expect(instance.getValue()).toBe('b');

    instance.dom.content.querySelectorAll('.glide-option')[1].click();
    await Promise.resolve();
    expect(instance.getValue()).toBeNull();
  });

  it('keeps the always-open virtual list compatible with checkbox selection', async () => {
    instance = new Glide(mount(true), {
      presentation: 'always-open',
      plugins: [checkboxSelection()],
    });

    expect(instance.dom.dropdown.hidden).toBe(false);
    expect(instance.dom.content.querySelector('.glide-checkbox')).not.toBeNull();
    instance.select('b');
    await Promise.resolve();
    expect(instance.dom.content.querySelector('[data-item-id] .glide-checkbox[data-checked="true"]')).not.toBeNull();
  });

  it('can hide selected chips in always-open mode', async () => {
    instance = new Glide(mount(true), {
      presentation: 'always-open',
      searchable: false,
      showSelectedChips: false,
    });
    instance.select('b');
    await Promise.resolve();

    expect(instance.dom.control.classList.contains('glide-control--hidden')).toBe(true);
    expect(instance.dom.control.querySelector('.glide-tag')).toBeNull();
    expect(instance.getValue()).toEqual(['b']);
  });

  it('renders accordion in flow and lets it open and close', () => {
    instance = new Glide(mount(), { presentation: 'accordion' });

    expect(instance.dom.dropdown.parentElement).toBe(instance.dom.root);
    expect(instance.dom.dropdown.hidden).toBe(false);
    expect(instance.dom.root.classList.contains('is-open')).toBe(false);
    expect(instance.dom.dropdown.getAttribute('aria-hidden')).toBe('true');
    expect(instance.dom.dropdown.hasAttribute('inert')).toBe(true);

    instance.open();
    expect(instance.dom.root.classList.contains('is-open')).toBe(true);
    expect(instance.dom.input.getAttribute('aria-expanded')).toBe('true');
    expect(instance.dom.dropdown.hasAttribute('aria-hidden')).toBe(false);
    expect(instance.dom.dropdown.hasAttribute('inert')).toBe(false);

    instance.close();
    expect(instance.dom.root.classList.contains('is-open')).toBe(false);
    expect(instance.dom.dropdown.hidden).toBe(false);
    expect(instance.dom.dropdown.getAttribute('aria-hidden')).toBe('true');
    expect(instance.dom.dropdown.hasAttribute('inert')).toBe(true);
  });

  it.each([false, true])('keeps an accordion open after selection (multiple: %s)', async (multiple) => {
    instance = new Glide(mount(multiple), { presentation: 'accordion', searchable: false });
    instance.open();

    instance.dom.content.querySelectorAll('.glide-option')[1]?.click();
    await Promise.resolve();

    expect(instance.getValue()).toEqual(multiple ? ['b'] : 'b');
    expect(instance.getState().open).toBe(true);
    expect(instance.dom.root.classList.contains('is-open')).toBe(true);
  });

  it.each([false, true])('can keep an accordion heading static after selection (multiple: %s)', async (multiple) => {
    instance = new Glide(mount(multiple), {
      presentation: 'accordion',
      searchable: false,
      staticControlLabel: 'Amenities',
    });

    instance.select('b');
    await Promise.resolve();

    expect(instance.dom.control.querySelector('.glide-value')?.textContent).toBe('Amenities');
    expect(instance.dom.control.querySelector('.glide-tag')).toBeNull();
    expect(instance.getValue()).toEqual(multiple ? ['b'] : 'b');
  });

  it('renders popup as a portaled grid with an optional panel heading', () => {
    instance = new Glide(mount(), {
      presentation: 'popup',
      panelLabel: 'Category',
    });

    expect(instance.dom.dropdown.parentElement).toBe(document.body);
    expect(instance.dom.dropdown.querySelector('.glide-panel-header')?.textContent).toBe('Category');
    expect(instance.dom.content.querySelectorAll('.glide-option')).toHaveLength(3);

    instance.open();
    expect(instance.dom.dropdown.hidden).toBe(false);
    expect(instance.dom.dropdown.style.width).not.toBe('');
    expect(instance.dom.dropdown.style.getPropertyValue('--glide-popup-anchor-x')).not.toBe('');
  });

  it.each([false, true])('can keep a popup trigger label static after selection (multiple: %s)', async (multiple) => {
    instance = new Glide(mount(multiple), {
      presentation: 'popup',
      searchable: false,
      staticControlLabel: 'Beds',
    });

    instance.select('b');
    await Promise.resolve();

    expect(instance.dom.control.querySelector('.glide-value')?.textContent).toBe('Beds');
    expect(instance.dom.control.querySelector('.glide-tag')).toBeNull();
    expect(instance.getValue()).toEqual(multiple ? ['b'] : 'b');
  });
});
