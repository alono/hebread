# hebread — קוֹרֵא עִבְרִית
Web app teaching Hebrew reading to kids (phonics, full niqqud). Static, no backend.

## Source of truth
- .claude/PRD.md is the ONLY source of truth. On any conflict, PRD.md wins.
- PROGRESS.md tracks phase completion. DECISIONS.md logs choices not covered by the PRD.

## Hard rules
- All child-facing text: Hebrew, fully and correctly niqqud-ed. A niqqud error is a blocking bug.
- Never invent Hebrew content words not in src/content/ JSON without running the nikud-reviewer agent on them.
- No server, no external runtime APIs, no analytics. localStorage key: hebread-progress-v1.
- After every code change: `npm run test && npm run validate:content && npm run build` must pass before moving on.

## Workflow
- Work phase by phase per PRD.md §11. Loop: implement → test → fix → repeat until green.
- At the end of each phase, run the phase-verifier agent before marking it done in PROGRESS.md.
- Package name: hebread. On-screen logo: קוֹרֵא עִבְרִית.