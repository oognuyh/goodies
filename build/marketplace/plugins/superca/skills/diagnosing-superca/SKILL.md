---
name: diagnosing-superca
description: Diagnose a current or identified past Superca session from transcript evidence, including repeated work, missed skills, poor results, time/cost, or a requested bug report.
---

# Diagnosing Superca

Diagnose from transcript evidence, separating confirmed causes, inferences, and
missing evidence. Every finding cites `path:line`; every number comes from the
transcript or a command you ran.

Before reading any session file, read
[context safety](references/context-safety.md). At location/discovery, read
[session discovery](references/session-discovery.md). Read analyst prompts only
for selected dimensions; issue/export/similar-session details apply only when
requested below.

## Workflow

Track the applicable steps. Steps 5–7 run only on their stated condition.

1. **Problem intake.** Write a
   statement naming the session(s), the turn range if known, what your
   partner expected, what happened, and the observable they care about
   (wall-clock, tokens, repeated actions, one specific action). "It took
   too long" needs an observable measure. Infer what the transcript proves;
   ask one focused question only when a missing expectation changes the
   investigation. A whole-session "why" is a valid complaint; begin with supported
   observables. Note whether the goal is a Superca bug report.
2. **Locate.** Resolve each session to verified absolute filesystem paths using
   `references/session-discovery.md`. Confirm a past session by quoting its
   first prompt and timestamp, and list every candidate you rejected with the
   reason, or "none". Enumerate subagent transcripts. Keep case notes in the
   current response by default, following the provenance rules in
   `assets/templates/case.md` for environment and skill observations. When a
   saved report or bug-report workflow was requested, create
   `~/.superca/diagnosing-superca/<session-id>/`, tell your partner the path,
   and fill the case template there.
3. **Triage.** Read the region around the reported problem yourself. Use only
   the relevant analyst dimensions; dispatch independent analyses in parallel
   when they materially improve the diagnosis. Give each analyst the
   case notes or case file path, `references/prompts/analyst-common.md`, and one dimension file from
   `references/prompts/`: `skill-timeline.md`,
   `plan-adherence.md`, `repeated-work.md`, `stumbles.md`,
   `quality-evidence.md`, `request-conflicts.md`, `cost-and-time.md`.
   Split a dimension by turn range when the transcript is long. Discard
   any returned finding without `path:line`.
4. **Report.** For an answer-only request, give a concise diagnosis with
   evidence, confidence, and gaps in the response. For a requested saved
   report or bug-report workflow, fill every section of
   `assets/templates/report.md` in order, write it to the workspace, show it,
   and give its path. Check what cited content actually proves and preserve
   any saved supporting case; a symlink alias is not a redundant copy.
5. **GitHub issues** — only when your partner asks for an issue or bug-report
   workflow. Search open and closed issues for the symptoms per
   `references/github-issues.md`. Show matches and suggest adding the
   report to the closest. If none match, fill `assets/templates/issue.md`, write
   it to the workspace, and show the exact text. Create an issue or comment only
   after approval of that text. `gh` cannot attach files; if a bundle exists, give
   your partner its path to attach in the browser.
6. **Export** — only when requested; read
   [bundle export](references/bundle-export.md). A bug-report request permits
   offering a scrubbed bundle once, not building it. No archive until the user
   has seen and approved its scrub log and file list.
7. **Similar sessions** — when asked. Turn confirmed findings into a
   signature, list candidates by mtime and size, find marker line numbers,
   dispatch `references/prompts/similar-session.md` per candidate in parallel, and
   append report §9.

## Quick reference

Start with the matching dimension below. Add another only when evidence crosses
that concern; a targeted diagnosis needs no fixed analyst roster.

| Complaint | Read first, lead with |
|---|---|
| "It took too long" | cost-and-time, stumbles |
| "Why did it do this extra work?" | repeated-work, plan-adherence |
| "Why is it so expensive?" | cost-and-time |
| "What the hell is it doing?" (still running) | skill-timeline; note in-progress in coverage |
| "It ignored the plan" | plan-adherence, compaction lines first |
| "Skill X never fired" | skill-timeline |

## Hard rules

- **Read-only.** Never modify, move, or delete a session file.
- **Exact paths to subagents.** A subagent's "current session" is its
  own. Pass absolute paths and ids.
- **Human prompts only.** Hook output, system reminders, and tool results
  are not your partner's words. In a subagent transcript, "user" is the
  parent agent.
- **Changes.** Propose a minimal fix when improvement is requested; modify
  files only when the request authorizes a change.
