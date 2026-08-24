---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
---

# Finishing a Development Branch

Finish only from verified Orca state. Branch integration follows the owner's
existing choice; if no choice exists, ask after the gates pass.

## Preconditions

Complete the shared [Orca contract](../using-superca/references/orca-cli.md)
Prerequisites, then reconcile:

```bash
orca orchestration run-current
orca orchestration task-list
orca orchestration worker-list
```

Stop if the Orca runtime is not ready or the current worktree is not associated
with the intended Run.

## Step 1: Verify Implementation

Run the focused tests for the changed behavior, then the package or project
gate that proves the branch is shippable. Use fresh output from this tree. If a
check fails, fix it before continuing.

## Step 2: Verify Review State

Use `requesting-code-review` to create independent review Tasks against the
  explicit base/head or equivalent diff identity. Pass the approved spec (or
  direct bounded requirements) as well as the plan when one exists. The final
  review record must contain separate **spec compliance** and **implementation
  quality** verdicts.

Blocking findings must be resolved before finishing. A later change to reviewed
code, tests, generated artifacts, or approved requirements makes the verdict
stale; re-run review against the new diff identity.
If the reviewer cannot start, keep its Task blocked and continue the independent
project-doc assessment in Step 3. The blocked review still prevents finishing.

## Step 3: Run The Project-Doc Impact Gate

After implementation evidence is verified, invoke
`maintaining-project-docs` inside the same Orca Run before presenting
integration choices. Use bootstrap for an unassessed initial document set,
including Greenfield after its first verified slice; otherwise use update.
The gate must either:

- update only the durable documents affected by verified results, with its own
  verification evidence, or
- accept an explicit no documentation diff result and record that the change
  has no durable documentation impact.

The independent documentation review covers docs-only edits and no-impact
assessments. Wait for
`maintaining-project-docs` to finish against its final reviewed diff; a
Supervisor-only fix after `Issues Found` is not its completion evidence.
Return to Step 2 only if those edits changed an approved requirement or
another code-review input. Otherwise, retain the valid code verdict and
continue.

## Step 4: Reconcile Orca Resources

Before offering integration choices, reconcile **Tasks, workers, Deliveries,
terminals, worktrees**:

- Tasks: every current required implementation, review, and documentation
  obligation has accepted completion evidence. Preserve failed or superseded
  Tasks as history; verify their links to accepted replacements and settle
  their resources and Deliveries. Unresolved required work remains a blocker;
  do not relabel failed history as completed to make the graph appear clean.
- Workers: inspect the unfiltered `worker-list` for every Dispatch. Verify
  results before releasing a settled Dispatch; give each owned resource a
  reuse, explicit retention, or release disposition per the Orca CLI contract.
- Deliveries: consume and acknowledge complete batches through the shared
  [Delivery Checks](../using-superca/references/orca-cli.md#delivery-checks)
  procedure.
- Terminals: no active terminal is still performing branch work.
- Worktrees: `orca worktree current --json` names the current Orca-managed
  workspace and any other related worktree is listed for the owner.

Release only settled Dispatch resources after their results are accepted;
preserve unaccepted work and dirty worktrees. Leave deletion, branch
integration, push, and publication to the owner's choice. If required worker
results remain unaccepted, retain their resources and report the blocker
instead of offering integration choices.

## Step 5: Present Owner Choices

If integration is outside the Objective (for example a local experiment that
excludes publishing or external integration), keep the verified branch as-is
and report its location without a Gate. If the owner already chose a different
in-scope disposition, honor it without asking again. Otherwise, when
integration is part of the Objective but its disposition is missing, present
these choices:

```text
Implementation verified against Orca state. What would you like to do?

1. Merge locally
2. Create a pull request
3. Keep the branch as-is
4. Discard the branch/worktree

Which option?
```

Never choose for the owner. Merge, push, or delete only when specifically
authorized; discard requires explicit confirmation naming the branch, commits,
and worktree at risk.
