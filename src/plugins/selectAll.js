import { h } from '../utils/dom.js';

/**
 * Adds a "Select all / Clear all" button above the option list. Toggles
 * every currently enabled option, not just the ones visible after a search
 * filter (a filtered "select all" is rarely what users expect).
 */
export function selectAll({ label = 'Select all', clearLabel = 'Clear all' } = {}) {
  let button;
  let update;

  return {
    name: 'selectAll',
    init(instance) {
      if (!instance.multiple) return;

      button = h('button', {
        type: 'button',
        class: 'glide-select-all',
        onClick: (event) => {
          event.preventDefault();
          const items = instance.getOptions().filter((item) => !item.disabled);
          const allSelected = items.length > 0 && items.every((item) => instance.selectedSet.has(item.id));
          for (const item of items) {
            if (allSelected) instance.deselect(item.id);
            else instance.select(item.id);
          }
        },
      });
      instance.dom.dropdown.insertBefore(button, instance.dom.viewport);

      update = () => {
        const items = instance.getOptions().filter((item) => !item.disabled);
        const allSelected = items.length > 0 && items.every((item) => instance.selectedSet.has(item.id));
        button.textContent = allSelected ? clearLabel : label;
      };
      update();
      instance.on('change', update);
      instance.on('open', update);
    },
    destroy(instance) {
      if (!button) return;
      instance.off('change', update);
      instance.off('open', update);
      button.remove();
    },
  };
}
