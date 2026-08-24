# Claude Code Tool Notes

Read when preparing an explicit Claude Code terminal or diagnosing host startup.
[Worker Launch](orca-worker-launch.md#worker-launch) owns configuration/readiness checks.

Preserve required one-off plugin paths and provider/profile settings in explicitly
prepared workers; root-only options may not propagate. A permission-mode label
does not prove required tools are available.

Use supported background shell/job controls with retained read/stop handles.
Before resetting a failed conversation, preserve its Run/coordinator identity;
recover Tasks, Deliveries, and observation deadlines afterward rather than starting
a second supervisor to repair context.
