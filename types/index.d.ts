export type OptionValue = string | number;

export interface GlideOption {
  value: OptionValue;
  label?: string;
  disabled?: boolean;
  id?: string;
  [key: string]: unknown;
}

export interface GlideOptionGroup {
  label: string;
  options: GlideOption[];
  id?: string;
  disabled?: boolean;
  collapsed?: boolean;
}

export type GlideData = Array<GlideOption | GlideOptionGroup | OptionValue>;

export interface NormalizedItem {
  id: string;
  value: string;
  label: string;
  disabled: boolean;
  groupId: string | null;
  data: Record<string, unknown>;
}

export interface NormalizedGroup {
  id: string;
  label: string;
  disabled: boolean;
  collapsed: boolean;
}

export interface HighlightRange {
  0: number;
  1: number;
}

export interface OptionTemplateMeta {
  ranges: HighlightRange[] | null;
  selected: boolean;
}

export interface GlideTemplates {
  option(item: NormalizedItem, meta: OptionTemplateMeta): string;
  group(group: NormalizedGroup): string;
  tag(item: NormalizedItem): string;
  value(item: NormalizedItem): string;
  noResults(query: string): string;
  loading(): string;
  createLabel(query: string): string;
}

export interface LoadResult {
  items: GlideData;
  hasMore?: boolean;
}

export type LoadFn = (
  query: string,
  meta: { page: number; append: boolean; signal?: AbortSignal },
) => Promise<GlideData | LoadResult>;

export interface GlidePlugin {
  name: string;
  init?(instance: Glide): void;
  destroy?(instance: Glide): void;
}

export type GlideTheme = 'light' | 'dark' | 'auto';

export interface GlideOptions {
  multiple?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  fuzzy?: boolean;
  theme?: GlideTheme;
  className?: string;
  /** Extra class(es) on the control element — an official hook that survives internal re-renders. */
  controlClassName?: string;
  /** Extra class(es) on the dropdown panel — required for instance-scoped CSS to reach the panel, which is portaled to <body> by default. */
  dropdownClassName?: string;
  /** Panel container: true (default) portals to <body>; false keeps it inside the root (scoped CSS / focus traps / shadow DOM); an Element portals it there. */
  portal?: boolean | Element;
  placeholder?: string;
  options?: GlideData;
  value?: OptionValue | OptionValue[] | null;
  load?: LoadFn;
  debounceMs?: number;
  loadMoreThreshold?: number;
  loadOnInit?: boolean;
  plugins?: GlidePlugin[];
  templates?: Partial<GlideTemplates>;
}

export type GlideEventMap = {
  open: void;
  close: void;
  change: { value: OptionValue | OptionValue[] | null };
  search: { query: string };
  clear: void;
  create: { value: string; label: string; item: NormalizedItem };
  select: { value: OptionValue; item: NormalizedItem };
  deselect: { value: OptionValue; item: NormalizedItem };
  error: { query: string; error: unknown };
  destroy: void;
};

export interface GlideDom {
  root: HTMLElement;
  control: HTMLElement;
  input: HTMLInputElement;
  dropdown: HTMLElement;
  viewport: HTMLElement;
  content: HTMLElement;
}

export class Glide {
  constructor(target: string | Element, options?: GlideOptions);

  /** Only present on the UMD/browser-global build (dist/glide.umd.cjs). */
  static plugins?: {
    clearButton: typeof import('./plugins/clearButton.js').clearButton;
    checkboxSelection: typeof import('./plugins/checkboxSelection.js').checkboxSelection;
    selectAll: typeof import('./plugins/selectAll.js').selectAll;
    groupSelect: typeof import('./plugins/groupSelect.js').groupSelect;
    tagCreate: typeof import('./plugins/tagCreate.js').tagCreate;
  };

  readonly el: Element;
  readonly multiple: boolean;
  readonly remote: boolean;
  readonly dom: GlideDom;
  readonly templates: GlideTemplates;
  readonly selectedSet: Set<string>;

  open(): void;
  close(): void;
  toggle(): void;
  enable(): void;
  disable(): void;
  setDisabled(disabled: boolean): void;
  setTheme(theme: GlideTheme): void;
  destroy(): void;

  clear(): void;
  select(value: OptionValue | NormalizedItem): void;
  deselect(value: OptionValue | NormalizedItem): void;
  setValue(value: OptionValue | OptionValue[] | null): void;
  getValue(): OptionValue | OptionValue[] | null;

  setOptions(data: GlideData): void;
  addOption(option: GlideOption | OptionValue, groupId?: string | null): NormalizedItem;
  removeOption(value: OptionValue): void;
  getOptions(): NormalizedItem[];
  getGroups(): NormalizedGroup[];
  findOption(value: OptionValue): NormalizedItem | null;
  getState(): Record<string, unknown>;

  refresh(): void;
  focus(): void;
  blur(): void;

  on<K extends keyof GlideEventMap>(event: K, handler: (payload: GlideEventMap[K]) => void): () => void;
  off<K extends keyof GlideEventMap>(event: K, handler: (payload: GlideEventMap[K]) => void): void;
  emit<K extends keyof GlideEventMap>(event: K, payload?: GlideEventMap[K]): void;
}

export default Glide;
