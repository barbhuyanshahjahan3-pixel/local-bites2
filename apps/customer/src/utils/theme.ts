// App-wide color theme system. The "brand" color used everywhere (buttons,
// links, active tab, splash screen, etc.) is defined as CSS variables on
// :root instead of a fixed Tailwind color, so it can be changed at runtime
// without rebuilding the app — this is what makes the in-app theme picker
// (Profile > App theme) work, and what keeps every screen using the exact
// same single color instead of some screens hardcoding an old one.

export interface AppTheme {
  id: string;
  name: string;
  /** "R G B" space-separated, for Tailwind's rgb(var(--x) / <alpha-value>) pattern */
  rgb: string;
  darkRgb: string;
  /** Hex form, for places that need a plain color string (e.g. Razorpay checkout theme) */
  hex: string;
}

export const THEMES: AppTheme[] = [
  { id: 'orange', name: 'Orange', rgb: '234 88 12', darkRgb: '194 65 12', hex: '#ea580c' },
  { id: 'red', name: 'Red', rgb: '220 38 38', darkRgb: '185 28 28', hex: '#dc2626' },
  { id: 'green', name: 'Green', rgb: '22 163 74', darkRgb: '21 128 61', hex: '#16a34a' },
  { id: 'blue', name: 'Blue', rgb: '37 99 235', darkRgb: '29 78 216', hex: '#2563eb' },
  { id: 'purple', name: 'Purple', rgb: '147 51 234', darkRgb: '126 34 206', hex: '#9333ea' },
  { id: 'pink', name: 'Pink', rgb: '219 39 119', darkRgb: '190 24 93', hex: '#db2777' },
];

const STORAGE_KEY = 'lb_theme';
const DEFAULT_THEME_ID = 'orange';

export function getSavedTheme(): AppTheme {
  const savedId = localStorage.getItem(STORAGE_KEY);
  return THEMES.find((t) => t.id === savedId) || THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.style.setProperty('--brand-rgb', theme.rgb);
  root.style.setProperty('--brand-dark-rgb', theme.darkRgb);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.hex);
  localStorage.setItem(STORAGE_KEY, theme.id);
}

/** Call once on app boot to re-apply whatever theme the user last picked. */
export function initTheme() {
  applyTheme(getSavedTheme());
}
