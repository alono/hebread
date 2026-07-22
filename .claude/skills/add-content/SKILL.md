---
name: add-content
description: Procedure for adding or editing learning content (syllables, words, sentences, paragraphs) in hebread, including audio regeneration and validation.
---
1. Add/edit items in the correct JSON under src/content/, following types.ts schemas.
2. If pronunciation may differ from display (single syllables!), set spokenForm.
3. Run: npm run validate:content — fix until green.
4. Run: node scripts/generate-audio.mjs — confirm a new MP3 exists for every new id.
5. Invoke the nikud-reviewer agent on the changed files; fix all defects it reports.
6. Run: npm run test && npm run build.
