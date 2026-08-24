---
name: executing-plans
description: Use when executing an approved implementation plan.
---

# Executing Plans

Execute the approved plan in one Orca Run. The root supervises the plan with or
without Helm; an active Helm retains ownership of the surrounding Objective.

## Establish The Work

Before mutation, read the shared [Prerequisites and Run/Task model](../using-superca/references/orca-cli.md).
Recover the matching unfinished Run and Tasks before creating missing work.
Use `using-git-worktrees` only when isolation is needed.

Use one root-owned implementation Task for small tightly coupled work. Split
only for independent ownership or dependency/verification order. The shared
Task model defines packet fields, statuses, review edges, and receipt handling;
do not maintain a second graph in host todo tools or local lifecycle files.

## Execute And Return

- The root may implement a tightly coupled Task when it will not delay active
  worker observation. Use bounded background work or a worker if it would occupy
  the root beyond its next checkpoint.
- For independent or long-running Tasks, invoke `subagent-driven-development`
  on the existing graph. Before worker preparation, read the shared
  [Supervisor Loop](../using-superca/references/orca-cli.md#supervisor-loop);
  launch and recovery references are read when those operations occur.
- Complete Tasks from explicit results and the plan's verification output.
  Reconcile Deliveries, Gates, and owned resources under the shared contract
  before returning; an empty mailbox does not establish completion.

Standalone execution ends at the requested plan boundary. With Helm active,
return to its next lifecycle step; do not create another Run or supervisor at
the handoff.
