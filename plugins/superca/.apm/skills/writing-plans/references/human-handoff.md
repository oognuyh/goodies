# Standalone Human Handoff

Read only when writing-plans runs without root Helm.

Link the saved, self-reviewed plan and wait for human review before implementation.
If the user already specified an execution method, preserve it and ask only
whether the plan captures the intended work. Otherwise present both methods:

- **Task-by-task reviewed Orca execution:** create/reuse one Run, implement each
  Task, and obtain a fresh Orca review before the next implementation Task.
  Use for meaningful independent review gates; continue with
  `subagent-driven-development`.
- **Single-owner Orca Task execution:** create/reuse one Run and one implementation
  Task for the whole plan, plus required final Orca review. Use for tightly coupled
  work where intermediate review adds no safety; continue with `executing-plans`.

Recommend one with evidence from task count, shared interfaces, and failure cost.
Ask whether the plan captures the intended work and which method to use, then
wait for review and selection. Do not ask for selection again when it was
already supplied.
