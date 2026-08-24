---
name: maintaining-project-docs
description: Use when a project needs initial durable documentation, a verified change affects project knowledge, or a final consequential decision needs an ADR.
---

# Maintaining Project Docs

Keep durable project knowledge in ordinary Markdown. Select `bootstrap`, `update`, or `decision`: use `bootstrap` for initial Brownfield documentation or after a Greenfield project's first verified implementation slice, `update` after a verified change in a current
Orca Run, or `decision` after a final ADR-grade Supervisor decision, including
a human-owned ADR-grade decision after its Gate is resolved.

## Rules

- This is documentation only and must not modify application code.
- Before writing documents, confirm Orca readiness and recover or create the
  current Run using [the shared contract](../using-superca/references/orca-cli.md).
  Without a ready runtime, return read-only findings or an in-chat draft as
  incomplete work.
- Before the first edit, create or recover the root-owned documentation Task in
  that Run. For an update, depend on the verified implementation/evidence Tasks.
  Keep this documentation Task open through in-scope review repairs while its
  spec and dependencies remain valid; record the reporting review Task and
  intended paths before each repair. Its result carries the current diff,
  outstanding findings, and review pointer, not a new Task for every wording
  correction. Replace it only when immutable scope or dependencies must change.
  Do not mark it completed because the edit or a repair is finished: only the
  final matched `Approved` verdict closes it.
- Use repository evidence, approved answers, approved specs, verified diffs,
  and the current Orca Run. Do not create a separate documentation executor.
- Distinguish user requirements from Supervisor choices and assumptions.
  Attribute a requirement to the user only from their actual request or a
  resolved Human Gate. Repeating a choice in an agent-written spec or AGENTS.md
  does not turn it into a user instruction; do not invent supporting quotations.
- Write only applicable documents. Empty templates are noise.
- Root `AGENTS.md` is canonical. `CLAUDE.md` contains exactly `@AGENTS.md`
  plus a final newline.
- Create a module-level `AGENTS.md` only when module rules are material and
  differ from the root instructions.
- Before writing or reviewing any project document, read
  [the project document format](references/project-document-format.md) and
  apply the relevant file's content shape, exclusions, and quality bar.
- End by requesting an independent documentation review as a separate Orca Task.
  Finish any in-scope plan or status evidence edits before fixing the reviewed
  document diff identity and sending the reviewer packet.
  Create that review Task only after the document diff exists or the no-impact
  assessment is ready with a verified implementation diff identity and an
  explicit empty changed-path list. Give it the
  completed evidence predecessors, **not** the still-open documentation Task:
  the documentation Task closes only after the review's final `Approved`
  verdict. Check `task-list` immediately before `task-create`: every proposed
  `--deps` Task must already be `completed`; use no dependency when there is
  no completed evidence predecessor. For a repair review, depend on the
  completed review Task that reported the finding.
  Fill [references/reviewer-prompt.md](references/reviewer-prompt.md) into the
  Task packet; a bare template path is not the worker's instruction body.
  Validate the final packet's IDs, status claims, dependencies, and diff identity
  against fresh receipts before `task-create`; an open documentation Task is
  neither completed evidence nor a dependency of its own reviewer.
  Name the changed and added paths, reviewed diff identity, and evidence
  pointers. Match the returned verdict to those inputs before accepting it.
  A `Blocked` reviewer result is no verdict: mark the root-owned documentation
  Task `blocked` with the review Task ID, reviewed diff, and exact skill,
  runtime, or evidence blocker. Keep its gate open for recovery and a later
  independent review; a committed document diff is not Task completion. If
  project tracking documents exist, record the unresolved review gap there
  before the eventual review of the final documentation diff.
- Review findings keep acceptance open. Check each exact reported case against
  current evidence; recover missing or corrupted reproduction details before
  rejecting a finding. A focused re-review must address every unresolved
  blocking finding it inherits, not just the last edit. `Issues Found` with an
  available in-scope repair is normal ongoing work, not a reason to replace the
  documentation Task or ask the user to approve the repair.
  Any repair that changes the document diff needs focused independent re-review
  before close-out, even when the finding was non-blocking.
- `Approved` on the unchanged reviewed diff closes the review gate. Record
  non-blocking suggestions without reopening the diff for polish. Reopen only
  for a materially false project claim or a user-requested correction; review
  that new diff independently before closing it.
  Report the actual final verdict and accepted non-blocking findings.

## Durable Documents

Use these paths only when the project has durable, work-changing facts for
that altitude:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/architecture.md`
- `docs/business-rules.md`
- `docs/user-journeys.md` (only for a durable cross-step user outcome)
- `docs/security.md`
- `docs/standards.md`
- `docs/engineering-notes.md`
- `docs/operations.md`
- `docs/contracts.md`
- `docs/tracking/status.md`
- `docs/tracking/findings.md`
- `docs/tracking/decisions/`

## Bootstrap

For Brownfield or Greenfield bootstrap:

1. Read verified code and tests; for Brownfield also inspect existing prose and relevant Git history. For Greenfield, distinguish approved but unimplemented scope from verified behavior.
2. Treat old prose as evidence, not authority.
3. Ask only for consequential intent, policy, rationale, or domain knowledge
   the repository cannot prove.
4. Assess every durable document slot above against the project document
   format. Record which slots have supported, work-changing facts and why the
   others do not; missing files are not evidence of inapplicability. Check
   whether a supported architecture or journey claim is clearer as Mermaid,
   and record the reason when no diagram is used.
5. Write `AGENTS.md`, exact `CLAUDE.md`, applicable `docs/` files, and only
   necessary nested `AGENTS.md` files.
6. Complete the shared independent review gate before presenting the result.

## Decision Capture

Use only after the Supervisor's final ADR-grade decision or resolution of its
human Gate. Before capture or ADR review, read
[decision capture](references/decision-capture.md) for classification evidence,
exact record shape, supersession, and the independent approval prerequisite.
It also defines when to make no ADR diff. `Accepted` records decision authority;
only `Approved` on the final reviewed text opens dependent implementation.

## Update

For Greenfield or new project work, bootstrap after the first implementation
slice is verified if the initial document set has not been assessed; otherwise
update it. Promote confirmed durable knowledge from the approved design
and verified implementation; keep unimplemented future scope in
`docs/tracking/status.md` as future, not current behavior.

For ongoing updates, inspect the verified implementation diff for durable
impact on:

- system boundaries or dependency direction;
- business rules or invariants;
- security policy;
- development or verification standards;
- operational procedures;
- external contracts;
- durable architectural or product decisions;
- current or future project scope.

For a review-finding repair without a new implementation diff, use the finding
and verified project evidence to update the affected documents and status claims.

Edit only the affected documents. If a change has no durable documentation
impact, make no documentation diff and include "no durable documentation impact",
the verified implementation diff identity, and zero changed document paths in
the review Task packet; record the same in the documentation Task result after
the final review. Complete the shared review gate for the impact assessment
and any updated documents.
