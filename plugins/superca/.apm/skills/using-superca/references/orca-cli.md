# Orca CLI Execution Contract

Orca is the execution ledger; specs, plans, docs, code, and tests stay in Git.
Before mutation, read **Prerequisites** and **Run And Task Model** below. Other
sections apply when their operation occurs:

| Operation | Read |
| --- | --- |
| Prepare or supervise workers | [Supervisor Loop](#supervisor-loop), then [Worker Launch](#worker-launch) |
| Start/replace collection | [Supervisor-Owned Polling](orca-polling.md) |
| Receive worker results | [Delivery Checks](#delivery-checks) |
| Resolve a launch/terminal failure | [Terminal And Worker Recovery](#terminal-and-worker-recovery) |
| Unknown mutation outcome | [Mutation Recovery](#mutation-recovery) |
| Human decision blocks work | [Human Gates](#human-gates) |
| Close, pause, or hand off | [Worktrees](#worktrees) and the active Supervisor Loop's cleanup |

## Prerequisites

Check `orca status --json`. If the CLI/runtime is unavailable, stop mutation,
including project-document and ADR writes. Read-only analysis or an in-chat
draft may continue; neither satisfies a documentation Task's review gate.

For an unclear command/flag, inspect `orca <verb> --help`; query only missing
detail from `orca agent-context --json` via
`.commands[] | select(.command == "<verb>")`.

Before creating a Run or worker, compare `orca worktree current --json` with
`git rev-parse --show-toplevel`: it must identify this exact project. The root
must run in its registered project worktree with a unique coordinator identity.
Creating an unrelated terminal does not give the current shell that identity.
If sender resolution fails, match the current session and exact worktree to
one live terminal with `terminal list` and `terminal read`, then use its handle
as `--from` (`--terminal` for `check`). Otherwise report a placement blocker;
do not borrow another session's identity or repair user-level trust/auth settings.

Recover with `orca orchestration run-current`. An empty result means unbound,
not absent. Inspect recent Runs' coordinator worktrees, Objectives, and Tasks;
bind the unique matching unfinished Objective with `run-use`. If the former
coordinator is gone and binding is refused, use documented takeover. Create a
Run only if none matches. A new request after verified, reported completion
gets a new Run even when it touches the same feature.

## Run And Task Model

Use one Run and at least one Task per mutation lifecycle. `run-create` creates
a namespace/home inbox, not a scheduler. Use the `orca orchestration` prefix for
`run-current`, `run-create`, `task-create`, `task-list`, and `task-update`.

Reuse existing work; split only for dependency order, ownership, or independent
verification. Host todo tools and local files are not a parallel execution ledger.
Materialize Tasks only with a complete spec and known dependencies. For reviews,
the artifact diff/evidence identity and full reviewer prompt must exist first;
keep later stages in the plan until their predecessor IDs exist.

Task packets carry goal, scope, ownership, dependencies, resource profile
(light/heavy/exclusive, peak estimate or unknown, contention), context pointers,
acceptance criteria, verification commands, forbidden actions, result shape,
and expected progress evidence/next observation deadline. Worker packets also
name required skills and the [Worker Protocol](#worker-protocol).

Statuses are `pending`, `ready`, `dispatched`, `completed`, `failed`, `blocked`.
Before creation, check the rendered packet against fresh inventory: cited IDs
exist, dependency statuses fit the stage, and the prose agrees with them.
Take Run/Task/Dispatch/terminal handles from parsed raw JSON; across tool calls,
reparse saved receipts or fresh inventory rather than retyping prose IDs.
On `task_not_found`, compare exact `task-list.result.tasks[].id` and `run_id`
before retrying.

### ADR Acceptance

For every ADR-grade decision, create an independent review worker Task and a
Supervisor-owned acceptance Task depending on it. Acceptance is the `--deps`
predecessor of dependent implementation Tasks. A review Task may complete with
`Issues Found`; complete acceptance only after comparing an `Approved` report
with the actual final ADR diff. Record its review Task ID, verdict, and diff
identity; an acceptance result's bare `Approved` claim is not proof.

A focused re-review gets a new review Task. Keep the acceptance Task open while
findings remain. If its original review dependency failed or was blocked, create
replacement acceptance/downstream Tasks depending on the successful re-review.
When the installed `task-update` cannot change dependencies, preserve failed
predecessors and supersede old downstream Tasks in their results; do not mark a
failure completed just to unblock the graph.

## Supervised Execution

Use `orca orchestration worker-start`, `worker-show`, `worker-read`,
`worker-list`, and `worker-release` for supervised workers and their exact
returned Dispatch resources. Root work is permitted by `executing-plans`;
a native worker is not an Orca worker.

## Worker Launch

Before preparation or attachment, read **Worker Launch** in
[Worker Launch and Terminal Recovery](orca-worker-launch.md). It owns effective
configuration, readiness, submission, and launch receipts. Read its failure and
terminal-recovery sections only when the corresponding condition occurs.

## Supervisor Loop

Before the first worker preparation, read [Supervision Procedure](orca-supervision.md).
The root owns this loop with or without Helm; a collector only observes.

The procedure requires one owned nonblocking collector (or disclosed foreground
fallback), whole-Run reconciliation between bounded operations, measured capacity
and exact write ownership before admission, complete Delivery handling, and root
acceptance before dependent work. Preparation/recovery counts as active supervision.
Keep this root turn alive while preparation, a Dispatch, or an expected Delivery
remains; model latency gaps must be reported rather than called healthy supervision.

## Terminal And Worker Recovery

On a launch/terminal failure, read the matching section of
[Worker Launch and Terminal Recovery](orca-worker-launch.md). Keep whole-Run
observation active while resolving one worker; technical failure alone does not
create human authority or permit a different execution path.

## Capacity And Resource Ownership

Before a wave and after launches, Deliveries, settlements, or pressure changes,
read `orca diagnostics memory --json` and
`orca orchestration worker-list --run <run_id> --include-remote --json`.
Add host load/disk evidence for CPU/I/O-heavy work. Worker slots are ceilings,
not host capacity: reserve coordinator headroom, probe one unknown-cost worker,
serialize heavy work until evidence supports overlap, and never overlap exclusive ownership.

An idle live worker still consumes capacity. On pressure, hold admissions and
release settled workers first; preserve active outputs before interruption.
Record the evidence needed to resume held Tasks and reconsider them at settlement.
Council independence permits resource-safe waves; Round 1 positions remain private.

## Worker Protocol

The injected Orca preamble owns executable paths, IDs/handles, message forms,
and heartbeat cadence. A worker owns one Task and never starts Orca workers.
Only an explicit review packet may allow one named read-only native reviewer
context without Orca ownership or further delegation.

Workers check follow-ups before a new file, after tests, and before completion;
use the preamble's `heartbeat`, `ask`, `escalation`, `check`, and `worker_done`
forms. Send `worker_done` exactly once with current Task/Dispatch IDs, changed
paths, verification, concerns, and remaining work. `consumer_fenced` means stop
without `worker_done`. If completion rejects the sender, compare literal
`--from` and capability with the preamble/current assignee; correct the mismatch
and confirm Task/Delivery receipts before inferring an unsupported Dispatch.

Pass Task/report/result text as literal CLI arguments through a structured API
or quoted shell literal form. JSON-encode structured results; do not use expandable
report strings or `eval`. Inspect returned content as well as command success.

## Delivery Checks

Receive with:

```bash
orca orchestration check --run <run_id> --terminal <verified_terminal_handle> --json
```

Read the complete `result.messages[]` batch, then promptly ACK its
`result.deliveryId` with the same command plus `--ack <delivery_id>`.
The FIFO batch replays until ACK. Missing expected fields require raw-response
inspection; they do not establish an empty inbox. On `stale_delivery`, reread
the current batch/ID. ACK is receipt, not acceptance: ACK before citation checks
or rerunning tests, retaining ownership until verification and resource disposition.

A successful receipt can contain shell-corrupted text. Missing decisive examples
or input/output leave the finding insufficient, not disproved. Recover the exact
case from the original output or scoped clarification; a nearby passing case
does not refute it.

## Human Gates

Use `orca orchestration gate-create` and `gate-resolve` only for scoped human
decisions blocking a named Task; record the exact decision. A Gate belongs to
one Run/Task. Do not inherit prior Runs' hook-trust Gates: inspect this Task's
intended worker profile and actual startup prompt before opening its Gate.

## Mutation Recovery

Preserve a mutating command's `--retry-request` ID and inspect it with
`orca orchestration request-show` when the response is lost. A completed receipt
means it landed; pending means observe or replay the exact command with that ID.
An absent receipt does not prove no mutation occurred.

## Worktrees

Use `orca worktree current --json` and `orca worktree create --json` for managed
checkout placement/lineage, following the installed command schema.

Before completion, pause, or blocking handoff, enumerate all Dispatches with:

```bash
orca orchestration worker-list --run <run_id> --include-remote --json
```

Follow `result.page.nextCursor` unchanged with `--cursor` until `hasMore` is false;
the default page has at most 100 rows. For every settled Dispatch, record accepted
deliverables and immediate reuse, explicit retention with reason, or
`worker-release`. Task completion or `worker_done` is not result acceptance;
a stopped process is not resource release. Preserve unaccepted work/dirty trees.

Fence a blocked live Dispatch with `worker-stop`, verify settlement, preserve or
accept its result, then `worker-release` and record the actual disposition.
For `retained: external_terminal`, reuse or close that exact externally owned
terminal and verify it with `terminal show`/`terminal list`; report the Dispatch
as retained and terminal as reused/closed. On `terminal_handle_stale`, reconcile
full handles against worker/terminal receipts before inferring death or closing
a tab. Never clean up a terminal whose exact identity/ownership does not match.

No active Dispatch or owned resource without explicit reuse/retention disposition
may be reported reconciled. Retained unresolved work still blocks completion.
Drain and ACK all complete Deliveries, reconcile Gates and mutation receipts,
and stop/confirm only this Run's owned collector under the supervision procedure.
