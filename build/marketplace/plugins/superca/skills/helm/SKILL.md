---
name: helm
description: Use when a user asks Superca to take responsibility for completing an objective rather than invoking one lifecycle skill directly.
---

# Helm

The root owns one **Objective** through skill transitions to a verified outcome.
Workers own only their assigned Orca Tasks; they do not invoke Helm.

## Activation And Authority

Activate on explicit invocation or a request to own an objective end to end;
announce its outcome, scope, success evidence, and stop condition. A standalone
skill request does not activate Helm. Reuse approved designs and plans, starting
at the first unmet prerequisite.

Helm approves routine delegated stages, including brainstorming's design and
written spec. Review the artifact and continue in the same turn; a delegated
skill's ordinary approval prompt becomes a progress update. This authority
cannot substitute for an independent code or documentation review verdict.

For a potentially Human-owned choice or materially different alternatives with
lasting consequences, invoke `decision-council` to classify it. Record the
classification; convene Council only when its ADR and stakeholder predicates
hold. Helm remains the delegated decision maker. Capture every ADR-grade
decision through `maintaining-project-docs`, whether Council met or not, and
invoke its decision-capture path for resolved Human-owned decisions made without Council.
Before dependent work, require the final ADR's Approved independent review and
the Supervisor-owned acceptance edge in the Orca Task graph.

Ask the human only for `decision-council`'s Human-owned cases or the Orca
host-trust boundary. Before asking, record a scoped pending Gate in the Run,
naming the blocked Task, evidence, options, and exact decision. If Orca is
unavailable during read-only framing, ask the missing human-owned question in
chat and record it when a Run becomes available; do not represent it as an Orca Gate.

## Lifecycle

1. **Route** from the current prerequisite:

   | Work | Skill |
   | --- | --- |
   | Reported failure | `systematic-debugging` before a fix |
   | New or changed behavior | `brainstorming`; its path determines whether `writing-plans` is needed |
   | Feature, fix, refactor, or behavior implementation | `test-driven-development` |
   | Approved plan | `executing-plans`, or `subagent-driven-development` for independent reviewed Tasks |
   | Independent code review, after the diff exists | `requesting-code-review` |
   | Durable documentation or review-finding repair | `maintaining-project-docs` |
   | Completion claim | `verification-before-completion` |

2. **Establish execution state.** Read-only work stays local. Before mutation,
   read the [Orca Prerequisites and Run/Task model](../using-superca/references/orca-cli.md).
   Recover the matching unfinished Run and existing Tasks before creating work.
   Keep activation, Objective, plan pointer, and next action in existing Orca
   work; specs, plans, code, tests, and durable docs remain in Git. Do not create
   a Helm state file or parallel personal-memory log.

3. **Supervise.** Before worker preparation, read the shared
   [Supervisor Loop](../using-superca/references/orca-cli.md#supervisor-loop).
   Its launch reference owns provider/profile/model/permission validation and
   recovery; use recorded effective settings after compaction. Reviewers and
   Council stakeholders use Orca Tasks and workers, including the contract's
   bounded read-only fallback, rather than invisible native background agents.
   Root implementation and long documentation repairs stay outside active
   worker windows. Record pending repairs, keep observing workers, then make
   root-owned documentation edits after the wave settles.

4. **Continue across stages.** Skill completion returns control here. Compare
   results with the Objective; update the plan before changed downstream work.
   For an existing verified project with unassessed docs, at the first verified
   implementation slice, and at later verified milestones, apply the
   [documentation checkpoints](../using-superca/references/helm-checkpoints.md).
   A Gate holding part of the graph does not hold independent authorized work.
   After exhausted worker recovery, transfer implementation to the root through
   `executing-plans` only under the shared contract's ownership-transfer conditions.

5. **Close.** Use `finishing-a-development-branch` for a verified mutation,
   including when no integration remains: preserve its verification, final code
   review, documentation-impact gate, and the owner's existing integration choice.
   Each required Task must agree with its actual artifact and final review
   verdict; an unapproved documentation Task remains open or blocked. Apply
   [final resource reconciliation](../using-superca/references/orca-cli.md#worktrees)
   to every Dispatch, terminal, and worktree, including failed and injected attempts.

## Continuation And Recovery

While worker preparation/recovery is pending, a Dispatch is live, or a Delivery
is expected, retain this root turn and interpret the shared loop's observations.
A running collector, Run ID, launch receipt, or progress briefing does not
transfer supervision. End only at verified completion, a Human-owned Gate with
no independent ready work, an unrecoverable blocker, or explicit pause/cancel.

After interruption, recover the matching Run, coordinator binding, Tasks,
Dispatches, Gates, unconsumed Deliveries, pending receipts, polling session, and
observation deadlines before mutation. Use supported takeover if the prior
coordinator is gone; never introduce a second live supervisor. Before a blocking
handoff or pause/cancel, reconcile owned resources and preserve the next action.
A forced turn end suspends supervision even if collection remains alive.

## Completion Report

Report the outcome and artifacts, fresh verification and independent verdicts,
documentation impact, and remaining Human-owned decisions. For an Orca Run,
include resource dispositions and the shared loop's cadence assessment:
collection gaps and root response delays, separately for preparation/recovery
and execution, or explicitly unmeasured intervals.
