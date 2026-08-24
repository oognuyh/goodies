# Startup Hook Review

Read only when the intended worker profile presents a hook-review prompt.
Required Orca communication hooks, skill discovery, and tool permissions are
launch prerequisites. Superca's bundled SessionStart and Stop hooks only emit
reminders; their execution is optional unless the Task verifies hook delivery.

The native **Continue without trusting** choice may be used only when fresh,
complete inventory or native hook review for this profile/session proves:

- Every untrusted hook matches the installed bundled Superca SessionStart or
  Stop definition: source/APM modules use `.apm/hooks/session-start.json` and
  `.apm/hooks/stop.json`; native plugins use their root `hooks.json`. Compare
  the actual installed definition, including the effective platform command.
  Check user-level and project/plugin hooks; event names,
  matching counts, and an echo-like prefix alone do not establish identity.
- All required Orca communication hooks remain trusted and active. A different
  profile's inventory or reading only the project hook file is insufficient.
- Required skills can be loaded directly, and the Task does not require these
  reminders to execute or be delivered.

Choose the observed refusal through supported native input, without trusting
any hook or changing trust/configuration. Read back startup and required Orca
hook/connector readiness before attaching the Task. If required hooks are no
longer active, hold the launch rather than continue. Record the inventory,
refusal, readiness evidence, and **reminder execution unverified** in the existing
coordinator Task.

If inventory/readiness evidence is incomplete, hold the launch and gather it;
do not infer optionality. For any unknown or required untrusted hook, or a Task
requiring reminder delivery, preserve the blocked Task and
open one scoped Human Gate for the exact unresolved hook decision. Do not retry
until that prerequisite changes. Never trust all, auto-approve hooks, manufacture
trust hashes, edit trust/configuration, disable required hooks, or bypass the
host prompt. Native refusal leaves optional hooks untrusted; it is not approval.
