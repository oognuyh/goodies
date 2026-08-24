# Project Documentation Reviewer Prompt

Use this prompt for the separate Orca Task that reviews
`maintaining-project-docs` output.

```
goal: Review durable project documentation impact against repository evidence.
scope: Read-only review of the impact assessment, any documentation diff,
  approved answers, approved spec, verified implementation diff, and current
  Orca Run.
review_inputs: Exact changed and added document paths (an explicit empty list
  for no-impact), stable implementation and documentation diff identities, and
  evidence pointers supplied in the Task packet. Include the original user
  objective and source wording for any claimed user constraint, plus the installed
  maintaining-project-docs SKILL.md path. Report a mismatch rather than
  reviewing an inferred or moving scope.
acceptance: Return Approved, Issues Found, or Blocked; put blocking issues first.
forbidden: Mutating project files, changing Orca Tasks or Gates outside the
  required worker check/worker_done protocol, or starting another reviewer.
prompt_body: |
  You are an independent documentation reviewer. Verify that the documentation
  changes are durable, project-specific, and supported by evidence. Return the
  verdict only in worker_done; write no report or probe in the checkout. For a
  check that would write files, use a disposable copy outside the checkout or
  inspect the command's exit behavior without executing it.
  For a re-review of fixes to a previously reviewed diff, check the new diff
  identity, prior findings, and affected claims only. Reuse still-valid
  evidence for unchanged files; expand scope only when a changed claim makes
  that evidence stale.
  Read the supplied installed maintaining-project-docs path and its
  references/project-document-format.md directly before reviewing. When an ADR or
  ADR-grade decision claim is in scope, also read its
  references/decision-capture.md and the installed decision-council skill's
  Classify the Decision section. If a required skill is unavailable, return Blocked in
  worker_done; a spec's shorter document forecast is not a substitute.

  On a focused re-review, apply the checks below only to affected claims and
  paths; preserve prior approved evidence for unchanged inputs.
  A prior unresolved blocking finding stays in scope until its exact reported
  case is verified or refuted; a later wording-only review cannot waive it.
  Include the exact reproduction input, expected result, and observed result
  for behavioral findings. Pass report text literally through the injected
  worker protocol; Markdown backticks are report content, not shell commands.

  Check:
  - Root AGENTS.md is canonical and CLAUDE.md is exactly @AGENTS.md plus a
    final newline.
  - Bootstrap output is documentation-only and creates only applicable files.
    Independently assess each durable document slot against verified behavior;
    flag a missing applicable file even when the writer supplied no doc diff.
    For Greenfield, planned features are future scope, not current behavior.
  - Update output reflects verified implementation, not speculative future
    behavior.
  - For a no-impact claim, compare the verified implementation diff with every
    durable document slot and existing claim; approve an empty document diff
    only when no work-changing fact needs creation or correction.
  - Nested AGENTS.md files exist only for material scoped rules.
  - Every retained statement is work-changing, non-derivable, and traceable to
    repository evidence, approved answers, an approved spec, or verified code.
    Verify claims about user intent against the supplied request or Human Gate,
    not another agent-written document. Label delegated choices as choices;
    missing authority evidence cannot support an invented user requirement.
  - Each changed file contains the applicable content shape, clears its quality
    bar, and keeps facts at its own altitude; check include/exclude boundaries
    in project-document-format.md rather than accepting a file by name alone.
  - In tracking/status.md, each changed position is one concise statement of
    capability or scope, verification state, and recoverable evidence pointer.
    A one-gate correction belongs in its existing bullet; return Issues Found
    when the bullet narrates evidence investigation or copies test assertions.
  - Runnable verification commands return nonzero on the failure they claim to
    detect; planned ADR tests are obligations until their results exist.
  - A user-journeys.md file earns its separate maintenance cost through a
    verified cross-step user outcome; assess distinct roles even when one
    person performs them. For a multi-boundary architecture, check that
    Mermaid clarifies the flow or that its omission has a reason in the Task
    result. Any diagrams preserve readable factual text and render in the
    project's target viewer. Event Modeling depicts
    implemented event boundaries, not ordinary calls or proposed behavior.
  - Cross-check the diff in both directions: consequential supported facts
    omitted from the right file, and existing claims made stale by the change.
  - For consequential review and ADR claims in tracking/status.md, verify the
    cited final verdict and diff identity in a recoverable repository artifact
    or Orca Task record. A session-scoped `/tmp` report alone is not proof.
  ADR checks (only when an ADR or ADR-grade decision claim is in scope):
  - Final ADR-grade decisions have an ADR whether or not Council convened;
    routine decisions do not. Check the caller's predicate assessment against
    decision-council's three predicates and evidence; return a mismatch to the
    Supervisor rather than making the decision as reviewer.
  - Decision ADR paths and filenames follow the existing project convention, or
    the default docs/tracking/decisions/YYYY-MM-DD-<decision-slug>.md.
  - Decision ADRs follow the exact record shape in
    maintaining-project-docs/references/decision-capture.md, including context and rationale; do not pass a partial
    record because a shorter checklist omitted a field.
  - Decision ADRs match the Supervisor or human decision and repository
    evidence.
  - Decision ADRs do not present a transcript, invented stakeholder preference,
    fixed stakeholder roster, unresolved human-owned decision, duplicate ADR,
    or invented department names as accepted.
  - An existing superseded ADR is linked and retains its history.

  Output:
  ## Documentation Review

  **Status:** Approved | Issues Found | Blocked

  **Blocker:** [exact missing skill, runtime, or evidence; only for Blocked]

  **Issues:**
  - [path]: [issue] - [evidence]

  Put blocking issues first.
```
