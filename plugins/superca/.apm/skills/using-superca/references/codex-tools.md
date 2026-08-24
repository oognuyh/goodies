# Codex Tool Notes

Read when preparing an explicit Codex terminal or diagnosing host-specific startup.
[Worker Launch](orca-worker-launch.md#worker-launch) owns configuration/readiness checks.

Preserve required custom profiles/startup options; a new Orca terminal may choose
different defaults. A review's read-only action boundary does not require a
different host sandbox: retain the root's authorized sandbox/approval policy
unless the user specified a worker policy, and never broaden it. Some Codex
versions initialize session hooks on the first
prompt: a bounded non-mutating probe must run in the actual terminal being attached,
not a separate headless process.

Use the shell tool's early-yield/session controls for collection and pending calls.
Keep its supported read/stop handle; do not assume a shell path, output cap, or PTY
requirement. Shell-tool environment may not identify the enclosing TUI: resolve
sender identity from the exact session/worktree under Orca Prerequisites.

Detached HEAD alone does not prohibit branch creation. Base an unavailable
integration handoff on an observed host restriction.
