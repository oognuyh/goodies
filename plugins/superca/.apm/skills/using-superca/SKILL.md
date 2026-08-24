---
name: using-superca
description: Use when starting a Superca session or deciding which Superca skill applies to the current task.
---

<SUBAGENT-STOP>
If dispatched as a subagent for a specific task, ignore this routing skill.
</SUBAGENT-STOP>

## Routing

Invoke requested and clearly applicable skills before task actions. Match the
user's objective to the trigger; a bounded skill request does not activate the
whole lifecycle. Only an active `helm` owns cross-skill continuation.

- New behavior: `brainstorming`.
- Reported failure: `systematic-debugging` before implementation skills.
- Durable project-document creation or changes: `maintaining-project-docs`
  before writing.

Announce the selected skill. Use the installed registry's selector: APM project
installs use bare names; native plugins may expose a namespace.

## Read At The Point Of Use

Read the selected `SKILL.md`; follow its conditional reference links rather
than loading the entire library.

- Before Orca-supervised mutation: [Orca prerequisites and Task model](references/orca-cli.md).
- When preparing an explicit agent terminal or diagnosing a host startup issue:
  [Codex notes](references/codex-tools.md) or
  [Claude Code notes](references/claude-code-tools.md).
