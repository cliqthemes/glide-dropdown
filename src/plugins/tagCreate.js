/**
 * Lets the user create a new option from free text: type a value that
 * doesn't match anything and press Enter. `validate` gates whether creation
 * is allowed at all (default: any non-blank text); `format` turns the raw
 * query into an option shape. Fires the `create` event on success.
 */
export function tagCreate({
  validate = (query) => query.trim().length > 0,
  format = (query) => ({ value: query.trim(), label: query.trim() }),
} = {}) {
  let handler;

  return {
    name: 'tagCreate',
    init(instance) {
      handler = ({ query }) => {
        if (!validate(query, instance)) return;
        const candidate = format(query);
        const existing = instance.findOption(candidate.value);
        if (existing) {
          instance.select(existing.id);
          return;
        }
        const item = instance.addOption(candidate);
        instance.select(item.id);
        instance.emit('create', { value: item.value, label: item.label, item });
      };
      instance.on('enterNoMatch', handler);
    },
    destroy(instance) {
      instance.off('enterNoMatch', handler);
    },
  };
}
