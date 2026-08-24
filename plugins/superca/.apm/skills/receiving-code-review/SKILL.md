---
name: receiving-code-review
description: Use when code review feedback arrives, especially when a finding is unclear or technically questionable.
---

# Receiving Code Review

Read the full feedback and verify each exact reported case against the approved
requirements and current code before editing. Treat external suggestions as
hypotheses; human feedback still needs a clear scope and understood requirement.
Respond with the technical result or reasoned pushback.

## Resolve the Finding

- Check reproduction inputs, expected and observed results, the reason for the
  current implementation, affected consumers, and relevant platforms/versions.
  A similar passing case does not refute the reported case.
- Recover original reviewer output when details are missing or garbled. Hold
  the unclear item and dependent changes while continuing independent verified
  fixes. Ask only for a missing human-owned choice.
- Before removing apparently unused behavior, check public and approved
  contracts; no local caller does not establish no consumers. Add no feature
  solely because a reviewer requested a more elaborate implementation.
- For a suggestion that breaks behavior, conflicts with an approved decision,
  or lacks evidence, explain the conflict with code/tests. Preserve the prior
  decision and route authority conflicts to their owner. Helm may resolve
  delegated architectural choices.
- If verification is unavailable, report the gap. If your pushback was wrong,
  state the new evidence and correct it.

## Repair and Re-review

Fix blocking issues first, then independent simple fixes and complex repairs.
Test each change and check regressions. Keep every unresolved blocking finding
open across focused re-reviews: approval of the last edit does not clear another
outstanding case.

Changing reviewed code, tests, generated artifacts, or requirements requires a
new diff identity and independent review under
[requesting-code-review](../requesting-code-review/SKILL.md). Documentation-only
repairs follow their documentation review gate. Report what changed and what
the final matched verdict establishes.

When authorized to reply to an inline GitHub comment, reply in that comment's
thread (`gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies`), rather
than creating a top-level PR comment.
