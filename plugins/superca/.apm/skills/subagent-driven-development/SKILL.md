---
name: subagent-driven-development
description: Use when an approved plan has independent implementation Tasks that need supervised workers.
---

# Subagent-Driven Development

The root supervises the approved plan through Orca workers. An active Helm
retains the surrounding Objective; dispatch does not transfer that ownership.

## Establish The Graph

Before mutation, read the shared [Prerequisites and Run/Task model](../using-superca/references/orca-cli.md).
Reuse the matching unfinished Run and implementation Tasks from
`executing-plans` or recovery; create only missing Tasks. Use
`using-git-worktrees` when isolation is needed.

The shared Task model defines packet fields and statuses. Include required
Superca skills and the worker protocol; keep full requirements in Git and pass
pointers. A root-only plugin path is not evidence the worker can load its skills.

## Dispatch And Supervise

Before worker preparation, read the shared
[Supervisor Loop](../using-superca/references/orca-cli.md#supervisor-loop), then
its launch reference when preparing or attaching a worker. It owns measured
admission, configuration/readiness/submission proof, same-Task recovery,
Delivery receipt, acceptance, and resource disposition.

Use one worker per ready Task. For two or more independent ready Tasks, apply
`dispatching-parallel-agents` to that wave in the same Run and graph. Reconsider
held Tasks after settlement or a capacity change.

Workers own one Task and never launch Orca workers. Only an explicit review
packet may permit one named read-only native reviewer context, with no Orca
ownership or further delegation.

## Review And Handoff

For required task-scoped reviews, invoke `requesting-code-review`. Embed its
reviewer prompt in the review Task's instruction body, including approved
requirements, plan pointer, fixed diff identity, and read-only boundary. Verdicts
arrive through Delivery; the reviewer does not edit the checkout. Represent fixes
with Task updates or new Tasks according to the installed dependency schema.

`finishing-a-development-branch` owns the final whole-branch code review;
still-valid task reviews support it rather than adding a second final gate.

On resume, restore the shared contract's Run, worker, Delivery, deadline, and
review state before mutation. Before returning, verify the plan and reconcile
Gates and resources. With Helm active, continue its lifecycle.
