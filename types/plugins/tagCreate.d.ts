import type { GlidePlugin, Glide } from '../index.js';

export function tagCreate(options?: {
  validate?: (query: string, instance: Glide) => boolean;
  format?: (query: string) => { value: string; label: string };
}): GlidePlugin;
