import { h } from '../utils/dom.js';

/**
 * Adds an "×" button to the control that clears the current selection.
 * Hidden automatically when there's nothing to clear, or the control is disabled.
 */
export function clearButton({ label = 'Clear selection' } = {}) {
  let button;
  let updateVisibility;

  return {
    name: 'clearButton',
    init(instance) {
      button = h(
        'button',
        {
          type: 'button',
          class: 'glide-clear',
          'aria-label': label,
          onClick: (event) => {
            event.stopPropagation();
            instance.clear();
            instance.focus();
          },
        },
        '×',
      );

      const caret = instance.dom.control.querySelector('.glide-caret');
      instance.dom.control.insertBefore(button, caret);

      updateVisibility = () => {
        const value = instance.getValue();
        const hasValue = instance.multiple ? value.length > 0 : value != null;
        button.hidden = !hasValue || instance.getState().disabled;
      };
      updateVisibility();

      instance.on('change', updateVisibility);
      instance.on('open', updateVisibility);
      instance.on('close', updateVisibility);
    },
    destroy(instance) {
      instance.off('change', updateVisibility);
      instance.off('open', updateVisibility);
      instance.off('close', updateVisibility);
      button.remove();
    },
  };
}
