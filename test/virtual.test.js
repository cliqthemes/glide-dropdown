import { describe, it, expect, afterEach } from 'vitest';
import { VirtualList } from '../src/virtual/VirtualList.js';

let viewport;
let content;
let list;

afterEach(() => {
  list?.destroy();
  viewport?.remove();
});

function mount({ viewportHeight = 300 } = {}) {
  viewport = document.createElement('div');
  content = document.createElement('div');
  viewport.appendChild(content);
  document.body.appendChild(viewport);
  Object.defineProperty(viewport, 'clientHeight', { value: viewportHeight, configurable: true });
  return { viewport, content };
}

describe('VirtualList', () => {
  it('only mounts a small window of rows for a 10,000 row list', () => {
    mount();
    list = new VirtualList({ viewport, content, rowHeight: 36, overscan: 4, renderRow: (index, el) => el ?? document.createElement('div') });
    list.setCount(10000);

    expect(content.children.length).toBeLessThan(30);
    expect(content.style.height).toBe(`${10000 * 36}px`);
  });

  it('recycles DOM nodes instead of creating new ones on scroll', () => {
    mount();
    const created = [];
    list = new VirtualList({
      viewport,
      content,
      rowHeight: 36,
      renderRow: (index, el) => {
        if (!el) {
          el = document.createElement('div');
          created.push(el);
        }
        el.textContent = String(index);
        return el;
      },
    });
    list.setCount(10000);
    const initialCreatedCount = created.length;
    expect(initialCreatedCount).toBeGreaterThan(0);

    viewport.scrollTop = 5000;
    list.update();

    // Recycling means the total number of elements ever created stays a
    // small multiple of the visible window, nowhere near the row count.
    expect(created.length).toBeLessThan(initialCreatedCount * 3);
    expect(created.length).toBeLessThan(50);
  });

  it('positions rows using translateY based on cumulative offset', () => {
    mount();
    list = new VirtualList({ viewport, content, rowHeight: 50, renderRow: (index, el) => el ?? document.createElement('div') });
    list.setCount(5);
    const first = content.querySelector('div');
    expect(first.style.transform).toBe('translateY(0px)');
  });

  it('supports variable row heights via getRowHeight', () => {
    mount();
    list = new VirtualList({ viewport, content, rowHeight: 30, renderRow: (index, el) => el ?? document.createElement('div') });
    list.setCount(3, (index) => (index === 0 ? 60 : 30));
    expect(content.style.height).toBe(`${60 + 30 + 30}px`);
  });

  it('clears all rendered rows when count drops to zero', () => {
    mount();
    list = new VirtualList({ viewport, content, rowHeight: 36, renderRow: (index, el) => el ?? document.createElement('div') });
    list.setCount(50);
    expect(content.children.length).toBeGreaterThan(0);
    list.setCount(0);
    expect(content.children.length).toBe(0);
  });
});
