/** Shared between `useTheme.ts` ("use client") and `app/layout.tsx` (a
 * Server Component, which can't import values out of a "use client" module)
 * — kept in a plain module with no directive so both can import the real
 * values instead of risking drift between a hook constant and a hand-typed
 * string in the inline FOUC-prevention script. */
export const THEME_STORAGE_KEY = "dtcg-ed-theme-preference";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
