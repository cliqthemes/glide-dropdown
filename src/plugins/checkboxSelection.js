/**
 * Renders a checkbox indicator in front of every option — the classic
 * "multi-select with checkboxes" look. Purely a template wrapper; selection
 * behavior is unchanged (clicking anywhere on the row still toggles it).
 */
export function checkboxSelection() {
  let originalOption;

  return {
    name: 'checkboxSelection',
    init(instance) {
      instance.dom.root.classList.add('glide-checkbox-mode');
      originalOption = instance.templates.option;
      instance.templates.option = (item, meta) => {
        const checked = instance.selectedSet.has(item.id);
        return `<span class="glide-checkbox" aria-hidden="true" data-checked="${checked}"></span>${originalOption(item, meta)}`;
      };
      instance.refresh();
    },
    destroy(instance) {
      instance.templates.option = originalOption;
      instance.dom.root.classList.remove('glide-checkbox-mode');
      instance.refresh();
    },
  };
}
