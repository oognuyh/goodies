---
name: test-driven-development
description: Use when implementing any feature or bugfix, before writing implementation code
---

# Test-Driven Development

Implement one observable behavior at a time: failing test, minimum implementation,
then local refactoring. Do not write every planned test against an imagined design
before implementing the first behavior.

Before writing or changing tests, read
[writing-good-tests](references/writing-good-tests.md). Choose a stable public
boundary from the approved contract and existing tests. Helm decides routine test
placement; unresolved human-owned intent follows
[decision authority](../decision-council/SKILL.md).

## Scope and Recovery

New features, bug fixes, refactoring, and behavior changes require a failing test
before implementation. Exceptions for throwaway prototypes, generated code, or
configuration require the active authority's explicit approval. Helm may decide
routine in-scope test strategy; human-owned exceptions stay with the human.

Establish the current Task's baseline, including staged and unstaged work,
before its first write. If you implemented before a valid RED, undo only your
own Task changes against that baseline and implement fresh from the tests.
An index or whole-file diff may contain another owner's changes and is not an
undo boundary. If ownership cannot be isolated safely, report the exact gap
to the Supervisor for scoped recovery instead of reverting the file.

## Red–Green–Refactor

1. **RED:** Write one test with a clear behavioral name, real code, and an
   independently derived expected result. For a new public entry point, keep
   discovery and setup runnable: look it up inside the test and assert its
   availability before exercising it. A missing export must fail an assertion,
   not abort collection with a top-level import error.
2. **Verify RED:** Run the test. Confirm it fails for the missing behavior,
   rather than a typo, setup error, or unrelated exception. If it passes, identify
   the untested behavior and correct the test before implementing.
3. **GREEN:** Write only the code needed to pass. If the test fails, fix the
   implementation; do not weaken the approved expectation.
4. **Verify GREEN:** Run the test and the project's test command, not only the
   file named in the Task. Investigate regressions and new warnings; name
   pre-existing failures with evidence instead of omitting them or silently
   expanding scope. A focused green test is not a green suite.
5. **REFACTOR:** Clean up locally while tests remain green. Changes to public
   contracts or module boundaries require the applicable design/plan review.
   Select the next behavior and repeat.

Before completion, confirm changed behaviors and relevant error/boundary cases
are covered at public boundaries, each new test has observed RED/GREEN evidence,
and required checks pass. Report unresolved failures without claiming completion.
Private helpers need no separate tests merely because they exist. An unrelated
baseline warning does not invalidate a proven cycle; assess its acceptance impact.

If the test is difficult to express, inspect the public contract and existing
tests before redesigning. Prefer a simpler interface or real integration boundary
over extensive mocking. For a bug, reproduce the original symptom as RED before
fixing it.
