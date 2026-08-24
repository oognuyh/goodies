---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, or before committing or creating a PR.
---

# Verification Before Completion

Support every completion or correctness claim with observed evidence covering
the artifact and environment being claimed. This applies before commits, PRs,
Task completion, moving to another Task, or relying on an agent's verdict.
Reuse complete observed results only while their inputs and coverage remain
valid; rerun when inputs change or output is missing or stale.

## Evidence Gate

Identify the check that proves the claim, execute it or validate still-current
results, inspect the complete output and exit code, then report the supported
status with evidence. If it fails or covers only part of the claim, state the
failure or narrower result. Confidence and a worker's success message are not
verification.

| Claim | Required evidence |
| --- | --- |
| Tests, lint, or build pass | Complete output from that check on current inputs; one check does not establish another |
| Bug fixed | The original symptom passes; a regression test has observed red–green evidence |
| Agent completed | Inspect artifacts and independently verify acceptance |
| Orca work completed | Current Run, Task, worker, and fully consumed Delivery evidence; silence or an empty inbox is insufficient |
| Requirements met | Check every applicable requirement against evidence; passing tests alone may omit requirements |

## Change-Sensitive Evidence

For changed behavior or shared contracts, trace affected consumers beyond direct
callers: persisted data, external payloads, configuration, and dependency versions.
Identify the compatibility assumption and run the smallest real-code test that
could falsify it. A caller list or green build alone does not prove compatibility.

Record **claim → consumer/entry point → command and fixture → observed result →
remaining gap** in the existing Task result or verification report. Distinguish
inspection from execution and pending checks. New systems need boundary checks,
not fabricated legacy-compatibility claims.

## Verify the User Path

For CLI, UI, API, or service claims, exercise the affected public entry point
with the existing repository harness. Helper tests establish helper behavior;
a screenshot establishes the captured state, not the action that led to it.

1. Confirm the intended build/instance and readiness. Use disposable fixtures
   and scoped outputs; respect shared ports, data, and sessions.
2. Perform the user action and inspect outputs and relevant side effects:
   files, responses, persisted state, or visible messages. Check promised absent
   effects too; `--dry-run` alone does not prove no writes or network calls.
   If a check cannot run safely, report the exact gap.
3. Clean up only resources this verification created, even after failure.
   Preserve evidence outside disposable state and confirm it survives cleanup.
   Route Orca-owned resource cleanup through the shared Orca contract.

Reuse existing tests and commands. Add a reusable verification procedure only
for recurring work, in existing project documentation; do not create a feature
map, state directory, or project skill merely to satisfy this gate. If the real
path is blocked, report the checks that passed without claiming end-to-end
validation.
