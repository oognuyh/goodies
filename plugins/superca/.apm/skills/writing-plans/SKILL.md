---
name: writing-plans
description: Use when an approved architectural design needs an implementation plan, or a user explicitly requests a plan.
---

# Writing Plans

Write an executable plan for a skilled worker without session history. Link the
approved spec and repository evidence; state ownership, acceptance, and checks.
Do not repeat the spec or transcribe the implementation.

Announce the skill. Save to `docs/superca/plans/YYYY-MM-DD-<feature-name>.md`
unless the user supplied a different location. Before writing, follow the
[Orca contract](../using-superca/references/orca-cli.md): recover/create the Run
and root-owned plan-writing Task with spec, path, self-review, and execution
handoff. Reuse matching work. Keep it open until required human review/selection
is resolved, and record the chosen execution method in its result. An isolated
worktree is created through `using-git-worktrees` at execution time.

## Build the Plan

Read [plan format](references/plan-format.md) when writing the artifact. It owns
the required header, task fields, and incomplete-plan checks.

- Split independent subsystems into separate plans, each producing testable
  software. Map file responsibilities before assigning tasks; follow repository
  conventions and avoid unrelated restructuring.
- One task owns one independently testable result and a meaningful fresh-review
  gate. Keep required setup, configuration, scaffolding, and task-local docs with
  that result. Split only when a dependency or review boundary warrants it.
- Forecast durable-document changes from the spec. `maintaining-project-docs`
  owns their decision/finishing update and review.
- For existing behavior/shared contracts, inspect persisted data, wire formats,
  configuration, dependency behavior, and consumers beyond direct callers.
  State the safety assumption, source evidence, and smallest executable check
  that could refute it in the owning Task. Mark untested assumptions pending.
  Greenfield work needs boundary checks, not an invented historical baseline.
  Use [change-sensitive evidence](../verification-before-completion/SKILL.md#change-sensitive-evidence).
- Give each task dependencies, exclusive write ownership, resource class
  (`light`, `heavy`, `exclusive`), peak estimate or `unknown`, CPU/I/O/build
  contention, acceptance commands, and progress evidence. Identify overlap and
  required ordering. The executor chooses observation deadlines and admissions
  from evidence and measured capacity; independence is not a slot reservation.

## Self-Review

Compare the complete plan to every approved requirement. Fix missing task
coverage, ambiguous ownership/interfaces, placeholders, inconsistent types or
signatures, and unassigned material risks/checks. Carry the spec's durable-doc
forecast or explicit no-impact result. This is an inline self-review, not an
additional subagent dispatch. If the caller explicitly requires independent
plan review, use [its template](references/plan-document-reviewer-prompt.md).

## Execution Handoff

Approval of the plan grants no merge, release, publication, deletion, or external
production authority. The root remains responsible for supervision; a standalone
executor supervises its plan through the shared Orca contract.

**Without Helm:** read [human handoff](references/human-handoff.md), link the plan,
obtain human review, and preserve any already-specified execution method.

**With Helm:** the Supervisor validates coverage, selects the method below from
coupling, independent review boundaries, and risk, and records its reason in the
current Task. If the plan or method raises a potentially ADR-grade or human-owned
choice, read [decision classification](../decision-council/SKILL.md#classify-the-decision)
before proceeding; create a scoped human Gate only for a human-owned choice.
Routine delegated selection continues without another approval stop.

- **Task-by-task reviewed Orca execution:** meaningful independent review gates;
  continue with `subagent-driven-development`.
- **Single-owner Orca Task execution:** tightly coupled work where intermediate
  review adds no safety; continue with `executing-plans`.
