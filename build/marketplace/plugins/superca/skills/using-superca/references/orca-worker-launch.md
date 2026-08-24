# Orca Worker Launch and Terminal Recovery

Read **Worker Launch** before preparation/attachment. Read **Failed Starts** or
**Terminal And Worker Recovery** only on the corresponding failure. The
[Supervisor Loop](orca-cli.md#supervisor-loop) remains the outer controller:
one bounded operation or early yield returns to whole-Run reconciliation.

## Worker Launch

### Route And Configuration

Save the supported managed `worker-start` arguments or explicit terminal launch
command and non-secret settings in the coordinator Task. Preserve this evidence
when updating its result; dispatch/completion replace worker Task results.

Compare effective provider/model, profile/plugin overrides, skills, worktree,
and permission policy with Task requirements. Preserve the user's model and
authorized policy; similarly named models or default settings do not prove a
matching profile, child authentication, or skill discovery.

| Evidence | Launch path |
| --- | --- |
| Effective model/profile/skills/permissions verified compatible | `worker-start --agent <provider> --model <model>` |
| A setting differs or inheritance is unknown | Prepare/verify an explicit terminal, then `worker-start --terminal <handle>` |
| Required configuration/readiness unresolved | Hold the Task with the missing prerequisite |

Use the installed host's supported terminal launcher and actual shell quoting.
Select the model in that command: `worker-start --terminal` cannot combine with
`--model`. Read only [Codex](codex-tools.md) or [Claude Code](claude-code-tools.md)
notes for that host. A Task result does not configure the child.

Root-only provider/plugin settings may not propagate. Use a configured
runtime/profile and verify the child; an empty managed-account list does not
exclude an environment-configured provider. Never print/copy credential values.
A default permission-bypass flag is not user authorization: relaunch with the
authorized policy rather than accept a bypass warning. Failure does not authorize
changing user-level permissions or hook trust.

### Readiness And Independence

Let `worker-start` manage readiness on a verified managed route. For an explicit
terminal, prove that exact terminal ready before attachment. If startup needs a
turn, send one bounded non-mutating probe there and verify tool execution and
Orca readiness; a separate headless process does not initialize the target.

Before substantive work, verify effective provider/model and required skill
selectors. Missing skills, connectors, required trust, or tool permissions are
launch prerequisite failures; preserve work and recover the same Task. A sandbox
startup error does not establish model unavailability. Check connector hooks in
the profile actually launched; Superca reminders and Orca communication hooks
serve different roles.

Independent review requires a fresh session on a terminal different from the
artifact's author/implementer sessions. A new Task on the author's terminal is
not independent context.

### Submission And Receipts

Use `worker-start` with the verified route; inspect `worker-show`'s
`result.worker` and `result.dispatch`, then bounded `worker-read` output.
Use low-level `terminal send` only when the installed guide requires it:

```bash
orca terminal wait --terminal <handle> --for tui-idle --timeout-ms <ms> --json
orca terminal send --terminal <handle> --text <prompt> --enter --wait-submit <seconds> --json
```

`input_accepted`/`ready` prove transport/readiness, not execution. Require
`turn_started` or equivalent plus substantive model output/tool activity;
an echoed packet, heartbeat, or idle composer is not progress. Check the first
bounded read for provider errors. On accepted-but-unconfirmed input, observe
that turn rather than pressing Enter or resending the prompt.

For an ambiguous transport failure, replay the entire original send, including
`--text` and `--enter`, with its `--retry-request` ID. Replay is idempotent but
may not add a later `turn_started` stage. `--wait-submit` alone is invalid.
Reconcile unknown receipts before a new Dispatch.

## Failed Starts

On nonzero `worker-start`, inspect `failedStage`, `residualResources`, receipt
recovery command, and bounded output. An idle composer proves neither process
exit nor turn start. For `agent_readiness`/`turn_start_unobserved`, reconcile
positive liveness and the prior receipt before retrying. Preserve dirty work;
release exact failed Dispatch resources with `worker-release`, not raw
`terminal close`.

For one confirmed-failure retry, prepare a fresh explicit terminal in the exact
worktree, verify profile/model/policy/hooks and TUI readiness, then attach the
**same Task**, using the failed Dispatch as `--retry-of` when supported. Record
both actual terminals' startup/readiness evidence. A preflight failure has no
Dispatch; do not invent `--retry-of`. An unknown result needs observation or
receipt reconciliation rather than replacement. If `task_not_startable`
refuses retry, inspect status/`error.data.nextSteps`; do not manufacture a new
mutation Task to bypass it.

### Read-Only Review Fallback

If the initial path and one fresh-terminal retry both fail readiness or turn
start despite verified configuration, mutation Tasks stay blocked. For independent
read-only code/documentation review only, a fresh configured terminal may receive
a replacement review Task through `orca orchestration dispatch --inject`.
The two recorded failures may be preflight or Dispatch failures; settle each
actual Dispatch and reconcile owned terminals before fallback.

Once established for the same runtime/profile/model in a Run, later read-only
reviews may use that fallback without repeating failed starts. Missing configuration
evidence, required hook trust, or permission does not qualify. Label injection
**unsupervised**; verify submitted review activity, `worker_done`, and the exact artifact diff.
Record observed provider/model with terminal evidence before it closes. Accept
the verdict as independent review, not supervised-worker evidence. Never inject
around trust or an Objective requiring supervised workers; if unavailable, report
the blocker.

### Root Ownership Transfer

After supported recovery is exhausted, Helm may direct `executing-plans` to
transfer implementation to the root only if worker execution is not an Objective
acceptance criterion and no Dispatch/Delivery remains live. Preserve failed Tasks;
otherwise mark the worker Task blocked. Create one root-owned replacement in
the same Run with the original completed predecessors and cross-link results.

Execute/verify it as root work and independently review its actual diff. Do not
dispatch the replacement to another worker or count it as supervised-worker
evidence. Changed dependencies or review targets may need replacement Tasks;
transport failure alone does not justify them.

## Terminal And Worker Recovery

Inspect exact `worker-show`/`worker-read` evidence and the receipt before input.
Some workers lack terminals; use their orchestration recovery. For a verified
live terminal, read its screen and installed `terminal send`/`terminal wait` help.

- Safe startup choices, such as skipping an optional update, use observed supported
  input and read-back readiness. Typing a menu number may not select it. A prompt
  does not authorize installation, authentication, or destructive work.
- For untrusted hooks, check whether the worker launched outside the intended
  profile. If so, stop/release that Dispatch and retry the same Task in the
  intended profile. Otherwise read [hook review](orca-hook-review.md) at this
  prompt: the host's refusal may skip only verified optional Superca reminders;
  required or unknown untrusted hooks still require a scoped Human Gate.
- On `agent_prompt_blocked`, follow the receipt's supported recovery surface.
  Do not repeat rejected text or bypass it with raw PTY writes. Missing supported
  recovery is a capability blocker.
- A draft proven never submitted may need one Enter; confirm submission.
  Accepted/ambiguous sends follow receipt replay or observation, never extra Enter.
- For confirmed failure/fencing, release exact resources and, after the cause
  changes and the old worker cannot write, retry the same Task with its original
  placement/provider and `--retry-of` when supported.

After identifying a missing prerequisite, hold that launch until new evidence
shows change; repeated auth/config probes do not repair it. Continue independent
ready work and whole-Run observation. Technical failure alone creates no Human
Gate. Do not silently replace Orca with native workers; record an authorized
alternative and its remaining verification gap.
