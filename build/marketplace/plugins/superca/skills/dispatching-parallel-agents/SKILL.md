---
name: dispatching-parallel-agents
description: Use when an Orca Run has two or more independent Tasks that can be dispatched concurrently.
---

# Dispatching Parallel Agents

Operate on the existing Orca Run and Task graph. Do not create another graph or
supervisor for a parallel wave.

## Admit The Wave

Read the shared [Supervisor Loop](../using-superca/references/orca-cli.md#supervisor-loop)
and [Capacity And Resource Ownership](../using-superca/references/orca-cli.md#capacity-and-resource-ownership)
before admission. Use its Worker Launch reference at preparation/dispatch time.

Only dependency-ready Tasks with disjoint ownership may overlap. Shared files,
runtime state, verification resources, or an unresolved decision require
sequential execution. Worker slots are a ceiling; measured host headroom and
coordinator reserve determine the wave. Unknown-cost workers start one at a time
until observed growth supports expansion.

## Dispatch And Settle

For each admitted Task, start one worker under the shared launch procedure.
After each start receipt, reconcile complete Task/worker/pressure observations
before inspecting the new worker. The outer supervisor loop continues between
launch operations; preparing the whole wave is not one blocking operation.

Use the shared Delivery and acceptance procedure to verify results before
dependent work relies on them, then record each Dispatch's resource disposition.
Reconsider held Tasks after launches, Deliveries, settlements, or pressure changes.

Each result names the Task, status, changed files, verification evidence,
commit/artifact pointers, and concerns. Silence and an empty mailbox do not
establish completion.
