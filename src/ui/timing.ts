// Shared feedback timings. e2e runs pass ?e2e=1 to collapse the delays so the
// Playwright flows are fast and stable.
export const FAST = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');
export const CORRECT_DELAY = FAST ? 60 : 750;
export const WRONG_DELAY = FAST ? 90 : 1500;
