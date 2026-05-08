# QA Review - Quality Team Setup

- Review ID: QA-2026-05-09-quality-team-setup
- Date: 2026-05-09
- Scope: Full app quality process setup
- Reviewer: Orchestrator + Product QA + UX/A11y Reviewer + Engineering Reviewer
- Decision: Approved

## Summary

Created the project quality-team workflow and ran it once against the application. The first complete QA run found lint failures while tests and production build passed. The engineering reviewer fixed the lint findings, then the final QA run passed all automated gates.

## Automated Checks

| Run | Report | Lint | Tests | Build | Result |
| --- | --- | --- | --- | --- | --- |
| Initial sandbox run | `.qa/test-runs/qa-run-2026-05-08T22-07-02-775Z.md` | Blocked by sandbox `spawn EPERM` | Blocked | Blocked | Environment blocked |
| First real run | `.qa/test-runs/qa-run-2026-05-08T22-07-30-442Z.md` | Fail | Pass | Pass | Fail |
| Second run | `.qa/test-runs/qa-run-2026-05-08T22-09-16-716Z.md` | Fail | Pass | Pass | Fail |
| Final run | `.qa/test-runs/qa-run-2026-05-08T22-10-02-928Z.md` | Pass | Pass | Pass | Pass |

## Requirements Reviewed

- QLT-001: `npm run lint` passes.
- QLT-002: `npm run test:run` passes.
- QLT-003: `npm run build` passes.
- QLT-004: QA process produces traceable reports for review.

## Findings And Fixes

1. [High] [Engineering] Lint gate failed on React hook and purity rules.
   Requirement: QLT-001
   Evidence: first real QA report showed failures in `ProjectFiles`, `ProjectTimeline`, `TaskRow`, `useData`, and date regex tests.
   Action: aligned async refresh effects with delayed callbacks, moved `Date.now()` out of render, and fixed unnecessary regex escapes.
   Status: Fixed.

2. [Medium] [Process] QA script could not spawn child processes in the sandboxed execution context.
   Requirement: QLT-004
   Evidence: sandbox report recorded `spawn EPERM`.
   Action: reran with elevated execution for the local QA command; the script works in normal execution and records the environment failure when blocked.
   Status: Documented.

## Files Added

- `docs/qa-team/README.md`
- `docs/qa-team/requirements.md`
- `docs/qa-team/acceptance-checklist.md`
- `docs/qa-team/ux-review-checklist.md`
- `docs/qa-team/engineering-standards.md`
- `docs/qa-team/bug-report-template.md`
- `docs/qa-team/review-report-template.md`
- `docs/qa-team/roles.md`
- `docs/qa-team/release-gate.md`
- `scripts/qa-check.mjs`
- `.qa/review-output/.gitkeep`
- `.qa/test-runs/.gitkeep`

## Files Changed

- `package.json`: added `npm run qa`.
- `src/App.tsx`: memoized visible project selection for stable hook dependencies.
- `src/components/ProjectFiles.tsx`: stabilized refresh and effect dependencies.
- `src/components/ProjectTimeline.tsx`: moved current-time calculation out of render.
- `src/components/TaskRow.tsx`: avoided synchronous state update inside effect.
- `src/hooks/useData.ts`: aligned file-count refresh effect with existing hook pattern.
- `src/test/ProjectCard.test.tsx`: removed unnecessary regex escapes.
- `src/test/TaskRow.test.tsx`: removed unnecessary regex escapes.
- `src/test/utils.test.ts`: removed unnecessary regex escapes.

## Open Risks

- UX checklist is ready, but no browser/mobile visual pass was executed in this setup round.
- Requirements were derived from current code and README; they should be reviewed by the product owner before becoming final acceptance criteria.

