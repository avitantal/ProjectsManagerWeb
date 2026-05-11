# QA Review — BLOCK
- Review ID: QA-2026-05-12-gcal-sync-v1-25
- Date: 2026-05-12
- Scope: V1.25 — Google Calendar auto-sync (googleCalendar.ts, useCalendarSync.ts, CalendarPickerDialog.tsx, CalendarSettingsDialog.tsx, Auth.tsx, AddDialog.tsx, TaskRow.tsx, SortableTaskList.tsx, ProjectCard.tsx, App.tsx, supabase.ts types)

## Decision
BLOCK. The release ships with 3 broken unit tests and 1 ESLint error (hard error, not warning), both of which fail the automated gate. Beyond the gate failures, there is a functional gap: task edits made through the TaskRow edit button do not trigger calendar sync, making the feature incomplete for a primary use case. These three issues must be resolved before shipping.

## Findings

| # | Severity | Owner | Finding | Status |
|---|----------|-------|---------|--------|
| 1 | HIGH | Boris | 3 failing unit tests in `ProjectCard.test.tsx` — tests assert stale text (`"40%"`, `"2/5 משימות הושלמו"`, `"אין משימות בפרויקט"`, `"100%"`) that no longer matches the V1.23 compact card layout. Tests must be updated to match current rendered output. | BLOCK |
| 2 | HIGH | Boris | ESLint hard error — `CalendarSettingsDialog.tsx:167` — `'_name' is defined but never used` in `CalendarFirstUseDialog.onSelect` callback. Fix: rename to `__name` or remove if truly unused (the name is passed but discarded; the `_` prefix is not honored by this project's ESLint config). | BLOCK |
| 3 | HIGH | Simona | Task edits via the TaskRow edit button do not trigger calendar sync. `TaskRow` opens `AddDialog` without passing `onTaskSaved`, so due-date changes made through the edit flow are silently not synced to Google Calendar. | OPEN |
| 4 | MEDIUM | Simona | Inline status/priority changes (`toggleDone`, `saveChanges` in TaskRow) do not call calendar sync. Calendar event descriptions include `סטטוס` and `עדיפות` fields that will become stale. | OPEN |
| 5 | MEDIUM | Boris | `flushPending` closes over stale `prefs` — the `prefs?.gcal_reminders` read inside `flushPending` reflects the state before `updatePrefs` resolved. On the first-use path this always falls back to `DEFAULT_REMINDERS`, which is the correct behavior, but the pattern is fragile if `flushPending` is ever called in a non-first-use context. | OPEN |
| 6 | MEDIUM | Boris | `void taskProjects` on line 124 of `useCalendarSync.ts` suppresses an unused-variable warning via runtime code. Remove the `taskProjects` parameter from `flushPending` — it is never used in the function body. | OPEN |
| 7 | MEDIUM | Moria | `CalendarPickerDialog` uses `items-center` (always-centered) while the rest of the app uses bottom-sheet on mobile (`items-end sm:items-center`). Inconsistent with established mobile modal pattern. | OPEN |
| 8 | LOW | Moria | Neither `CalendarPickerDialog` nor `CalendarSettingsDialog` has `role="dialog"` or `aria-modal="true"`. Focus is not trapped. Consistent with existing app debt, but new dialogs should not add to it. | OPEN |
| 9 | LOW | Boris | `buildEventPayload` uses `task.due_date!` non-null assertion. Structurally valid given call-site guard, but not enforced by the type system. Consider accepting `Task & { due_date: string }` as the parameter type to make the contract explicit. | OPEN |
| 10 | LOW | Simona | `CalendarFirstUseDialog` does not write `gcal_reminders` to preferences on first use. Users get DEFAULT_REMINDERS (1440, 120) by fallback — acceptable UX, but the preferences row remains incomplete until the user explicitly opens Calendar Settings. | OPEN |

## Action Items

1. **[Boris — BLOCK]** Fix the 3 failing `ProjectCard` tests. Update assertions to match current rendered text: `"2 מתוך 5 משימות"` + `"(40%)"` pattern, and `"אין משימות"` for zero tasks. The 100% case for done-project-with-no-tasks needs to verify the `width: 100%` style on the progress fill div, not a text node.
2. **[Boris — BLOCK]** Fix ESLint error in `CalendarSettingsDialog.tsx:167`. Rename `_name` to `_calendarName` — the double-underscore or a more descriptive name may satisfy the ESLint rule. Alternatively, restructure the callback to not receive unused params.
3. **[Simona/Boris — HIGH]** Wire `onTaskSaved` into the `AddDialog` opened from `TaskRow` (line 335-344 of `TaskRow.tsx`). Pass a callback that calls `syncTask(savedTask, scope, projects)`. This requires `TaskRow` to receive a `syncTask`-compatible callback, or for `onBeforeDelete`-style prop passthrough to be extended.
4. **[Boris — MEDIUM]** Remove the `taskProjects` parameter from `flushPending` in `useCalendarSync.ts`.
5. **[Boris — MEDIUM]** Evaluate wrapping `resolveCalendarId` and `syncTask` in `useCallback` if they are ever stabilized as dependencies in memoized children.
6. **[Moria — MEDIUM]** Update `CalendarPickerDialog` overlay class from `items-center` to `items-end sm:items-center` to match app mobile modal convention.
7. **[Moria — LOW]** Add `role="dialog" aria-modal="true" aria-labelledby` to both new dialog components.
