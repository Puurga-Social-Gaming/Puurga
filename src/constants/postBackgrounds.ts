/** Shared text-post background presets (indices must stay stable for existing posts). */
export type PostBackgroundPreset = {
  type: 'none' | 'color' | 'gradient';
  label: string;
  value: number;
  /** Applied to the post text area */
  class: string;
  /** Text color when this background is active */
  textClass: string;
  /** Optional swatch override (e.g. dashed border for None) */
  swatchClass?: string;
};

export const BACKGROUND_PRESETS: PostBackgroundPreset[] = [
  {
    type: 'none',
    label: 'None',
    value: 0,
    class: 'bg-transparent',
    textClass: 'text-foreground',
    swatchClass: 'bg-transparent border-2 border-dashed border-border',
  },
  // Legacy solid colors (kept for existing posts)
  { type: 'color', label: 'Warm', value: 1, class: 'bg-orange-100', textClass: 'text-gray-900' },
  { type: 'color', label: 'Cool', value: 2, class: 'bg-sky-100', textClass: 'text-gray-900' },
  { type: 'color', label: 'Nature', value: 3, class: 'bg-emerald-100', textClass: 'text-gray-900' },
  { type: 'color', label: 'Sunset', value: 4, class: 'bg-amber-100', textClass: 'text-gray-900' },
  {
    type: 'gradient',
    label: 'Ocean',
    value: 5,
    class: 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Sunrise',
    value: 6,
    class: 'bg-gradient-to-br from-pink-500 via-rose-400 to-orange-400',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Forest',
    value: 7,
    class: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600',
    textClass: 'text-white',
  },
  // New pro palettes
  {
    type: 'gradient',
    label: 'Midnight',
    value: 8,
    class: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Aurora',
    value: 9,
    class: 'bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-600',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Cherry',
    value: 10,
    class: 'bg-gradient-to-br from-rose-600 via-pink-500 to-fuchsia-600',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Gold Hour',
    value: 11,
    class: 'bg-gradient-to-br from-amber-300 via-orange-400 to-rose-400',
    textClass: 'text-gray-900',
  },
  {
    type: 'gradient',
    label: 'Lavender',
    value: 12,
    class: 'bg-gradient-to-br from-violet-200 via-purple-200 to-fuchsia-200',
    textClass: 'text-gray-900',
  },
  {
    type: 'gradient',
    label: 'Deep Sea',
    value: 13,
    class: 'bg-gradient-to-br from-cyan-700 via-blue-800 to-slate-900',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Ember',
    value: 14,
    class: 'bg-gradient-to-br from-red-700 via-orange-600 to-amber-500',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Mint',
    value: 15,
    class: 'bg-gradient-to-br from-teal-50 via-emerald-100 to-lime-100',
    textClass: 'text-gray-900',
  },
  { type: 'color', label: 'Blush', value: 16, class: 'bg-rose-100', textClass: 'text-gray-900' },
  { type: 'color', label: 'Sky', value: 17, class: 'bg-sky-50', textClass: 'text-gray-900' },
  {
    type: 'gradient',
    label: 'Noir',
    value: 18,
    class: 'bg-gradient-to-br from-neutral-950 via-neutral-800 to-zinc-700',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Candy',
    value: 19,
    class: 'bg-gradient-to-br from-pink-300 via-purple-300 to-indigo-400',
    textClass: 'text-gray-900',
  },
  {
    type: 'gradient',
    label: 'Citrus',
    value: 20,
    class: 'bg-gradient-to-br from-lime-300 via-yellow-300 to-amber-400',
    textClass: 'text-gray-900',
  },
  {
    type: 'gradient',
    label: 'Ice',
    value: 21,
    class: 'bg-gradient-to-br from-slate-100 via-cyan-100 to-blue-200',
    textClass: 'text-gray-900',
  },
  {
    type: 'gradient',
    label: 'Velvet',
    value: 22,
    class: 'bg-gradient-to-br from-purple-900 via-fuchsia-800 to-rose-700',
    textClass: 'text-white',
  },
  {
    type: 'gradient',
    label: 'Tropic',
    value: 23,
    class: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-lime-500',
    textClass: 'text-white',
  },
];

export function getPostBackgroundPreset(index?: number | null): PostBackgroundPreset {
  const i = typeof index === 'number' && index >= 0 ? index : 0;
  return BACKGROUND_PRESETS.find((p) => p.value === i) || BACKGROUND_PRESETS[0];
}
