# Contributing to hebread

Thanks for helping kids learn to read! Contributions of content (words, sentences,
paragraphs, fixes to niqqud) and code are both very welcome.

## Ground rules

1. **Niqqud is sacred.** All child-facing Hebrew must be fully and correctly niqqud-ed.
   A niqqud error is treated as a **blocking bug**. When in doubt, check a dictionary.
2. **`.claude/PRD-hebread.md` is the source of truth** for scope, pedagogy, and the
   12-level structure. If something conflicts with the PRD, the PRD wins.
3. **No server, no tracking.** Everything runs client-side; progress lives in
   `localStorage` under `hebread-progress-v1`. Don't add analytics or network calls at runtime.
4. **The gate:** every PR must pass
   ```bash
   npm run test && npm run validate:content && npm run build
   ```
   and the Playwright suite (`npm run test:e2e`).

## Adding content

See the **"Adding or editing content"** section of the [README](README.md) for the
full loop (edit JSON → `validate:content` → `generate:audio` → niqqud review → tests).

Content lives in `src/content/`:

- `syllables/` (levels 1–6) — **generated** from `scripts/gen-syllables.mjs`. To change
  a syllable, edit the generator's tables, not the JSON directly (a regen would overwrite it).
- `words/`, `sentences/`, `paragraphs/` (levels 6–12) — **hand-authored** JSON, following
  the schemas in `src/content/types.ts`.

Tips:
- Words: `syllables` must join back to `display` exactly (split on glyph boundaries).
- Prefer concrete, picturable nouns for word levels so an emoji can accompany them.
- Comprehension: emoji options are shown but not spoken; Hebrew-text options are spoken
  and must be niqqud-ed.
- Keep vocabulary age-appropriate (ages ~7–9).

## Code

- Pure game logic lives in `src/game/` and must stay free of React/DOM/store imports so
  it can be unit-tested. Add tests alongside (`*.test.ts`).
- UI lives in `src/components/` and `src/screens/`. Respect RTL, big touch targets (≥64px),
  `prefers-reduced-motion`, and keyboard focus states.
- New interactive behaviour should get a Playwright flow in `e2e/`.

## Reporting niqqud issues

Open an issue with the level, the exact string, what's wrong, and the corrected fully
niqqud-ed form. These are prioritized.
