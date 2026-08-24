---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review

Use an independent Orca review Task after each subagent-driven implementation
Task, after a major feature, and before merge. A fresh worker receives a fixed
diff and approved requirements, not the implementer's session history.

## Establish Review Inputs

Before creating review work, follow the
[Orca contract](../using-superca/references/orca-cli.md) prerequisites and read its
[Supervisor Loop](../using-superca/references/orca-cli.md#supervisor-loop) before
preparing or starting the reviewer, including its collector requirements.
Recover the current Run. If the runtime is unavailable, the independent review remains
blocked; an in-session review does not replace it.

- For committed work, capture explicit base/head SHAs, the matching diff
  command, and `git status --short`.
- For uncommitted work, create a stable patch covering every reviewed tracked
  and untracked change. Verify coverage against `git status --short`; record
  its absolute path, checksum, and verification/read commands. An empty commit
  range does not cover uncommitted work.

Create the review Task only after the implementation diff exists and its
identity is fixed; do not create placeholder review Tasks from a plan. Depend
on the completed implementation Task when one exists in this Run.

## Create the Review Packet

Before `task-create`, read and fill
[the reviewer template](references/code-reviewer.md) into the Task instruction
body; a template path alone is insufficient. Include the approved spec or
direct bounded requirements, plan when present, exact diff identity, read
commands, and dispatch-time status. Preserve its read-only checkout boundary;
temporary mutation and restoration are not allowed.

The fresh Orca worker is the supervised envelope. If its host exposes the
installed `superca-code-reviewer` agent/role, invoke that role once in a separate
context with the brief, then relay the verdict through `worker_done`. Otherwise
the fresh worker reviews the brief itself and reports the discovery limitation.
Check native agent/role invocation, not skill discovery. Orca's `worker-start
--agent` selects a CLI provider, not the named review role. Never reuse the
implementer's session.

The verdict separates **spec compliance** (including whether the plan preserved
the original requirements) from **implementation quality**.

## Supervise and Accept

Admit the reviewer against measured capacity. After `worker-start` returns its
receipt, poll the whole Run before reading the worker. Follow the shared
Supervisor Loop and
[Delivery Checks](../using-superca/references/orca-cli.md#delivery-checks).
Mark the review Task only from explicit worker or Task evidence. After accepting
the verdict, reconcile and release its settled Dispatch.

- Resolve Critical and Important findings before proceeding. Record Minor
  suggestions; dispute unsupported findings with technical evidence.
- If reviewed code, tests, generated artifacts, or approved requirements
  change, capture the new diff identity and request a new review.
- Documentation-only edits that preserve those inputs use the documentation
  review gate without repeating an unchanged code review.
