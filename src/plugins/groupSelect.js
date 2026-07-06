/**
 * Adds a small "select all in this group" affordance to group headers.
 * Wraps the group template (rather than touching core rendering) and
 * intercepts clicks on that affordance in the capture phase so they don't
 * also trigger the core collapse-toggle behavior on the same header.
 */
export function groupSelect() {
  let originalGroup;
  let handler;

  return {
    name: 'groupSelect',
    init(instance) {
      if (!instance.multiple) return;

      originalGroup = instance.templates.group;
      instance.templates.group = (group) =>
        `<button type="button" class="glide-group-select" data-group-id="${group.id}" tabindex="-1">Select all</button>${originalGroup(group)}`;

      handler = (event) => {
        const btn = event.target.closest('.glide-group-select');
        if (!btn) return;
        event.stopPropagation();
        const groupId = btn.dataset.groupId;
        const items = instance.getOptions().filter((item) => item.groupId === groupId && !item.disabled);
        const allSelected = items.length > 0 && items.every((item) => instance.selectedSet.has(item.id));
        for (const item of items) {
          if (allSelected) instance.deselect(item.id);
          else instance.select(item.id);
        }
      };
      instance.dom.content.addEventListener('click', handler, true);
      instance.refresh();
    },
    destroy(instance) {
      if (!handler) return;
      instance.templates.group = originalGroup;
      instance.dom.content.removeEventListener('click', handler, true);
      instance.refresh();
    },
  };
}
