# Xtack

Xtack helps a coding agent understand an outcome, carry out authorized engineering work, and report the evidence and gaps. Its workflows draw on Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack) and [Matt Pocock's skills](https://github.com/mattpocock/skills). It targets Codex and Claude Code; actual behavior depends on the host, configuration and available capabilities. The host remains responsible for running the agent and controlling its permissions.

## Start with an outcome

Invoke `xtack` with a request in one sentence. For example, with the native plugin:

```text
# Codex
$xtack:xtack Reproduce the duplicate notification, fix it, and verify the result.

# Claude Code
/xtack:xtack Diagnose the failed migration without making changes.
```

The agent is instructed to choose the methods and specialists the work needs. It can investigate, implement and verify a fix, or stop at a diagnosis, review or design when that is what you requested. A clear request does not require an interview. You can also invoke any installed specialist directly, for example `$xtack:xtack-trace` in Codex or `/xtack:xtack-trace` in Claude Code.

Xtack calls for **Voyage** when requested explicitly, or when a goal needs substantial coordination across independently verifiable units and dependencies, recovery after interruption, or a persistent goal. A small coherent task can remain in Xtack; multiple files or high risk alone do not require Voyage. Risk-appropriate checks and review still apply, and goal coordination can add time and token usage. The agent can switch to Voyage as work reveals the need. Skill routing and handoffs are instructions, not host-enforced behavior: discovery and the agent's choices determine what actually runs. Earlier [Claude Code + OpenCode Go observations](../../evals/xtack/workflow/claude-go-routing-recheck-2026-11-10.md) used an entrypoint with a more specific routing condition; they do not establish the behavior of the current general rule. If a specialist is unavailable, the agent should use available methods and report any resulting gap.

The execution core's `route` command classifies the intent and risk supplied to it and suggests specialist methods. It does not decide whether to start Voyage, discover omitted task facts, or prevent the host from editing. The agent must make the coordination choice and invoke the selected workflow.

## Skills

| Skill | Purpose | Typical outcome |
| --- | --- | --- |
| `xtack` | Route an engineering request and coordinate the needed methods. | Requested result, evidence and remaining gaps. |
| `xtack-chart` | Explore unclear intent or a domain decision with the user. | Clarified goal, constraints and decisions. |
| `xtack-voyage` | Coordinate larger or recoverable work. | Goal, verifiable units, dependencies and evidence-backed progress. |
| `xtack-survey` | Independently review a change or claim. | Findings, evidence, disposition and unverified scope. |
| `xtack-keel` | Evaluate consequential architecture choices. | Alternatives, tradeoffs and an ADR when warranted. |
| `xtack-trace` | Investigate a failure or explain behavior. | Evidence-backed cause or remaining hypotheses. |
| `xtack-trial` | Verify behavior or a guarantee. | Actual checks, results and unverified conditions. |
| `xtack-forge` | Implement an authorized change. | Changed artifact, checks, review and remaining risks. |
| `xtack-wake` | Address a recurring or consequential failure. | Prevention proposal or authorized fix with supporting evidence. |

These are available workflows, not a fixed sequence or a requirement to produce every artifact. Specialists can be invoked individually, including for diagnosis-only, design-only and review-only requests.

## Verification and decisions

Voyage scales its work to the impact, reversibility and uncertainty of the task. Light work uses focused self-review and relevant checks. Standard implementation requires relevant execution checks and independent requirements and standards review; Critical implementation adds checks for its actual risks. Plan, design, investigation and review requests use checks appropriate to the requested deliverable. A missing required review or check, a failed check, or an unresolved blocking finding prevents a verified result. Xtack should report what was actually observed and what remains unverified.

For a decision with meaningful reversal cost or impact, real alternatives and a rationale future maintainers need, the coordinator reuses an applicable ADR or seeks at least **two independent subagent stakeholder perspectives**, makes a decision and records an ADR before dependent implementation. If the user's boundaries or host prevent the required perspectives or ADR, dependent work remains blocked and the gap should be reported. Routine implementation choices do not all need an ADR.

Evidence and review records are not self-authenticating. A successful command reports its result; it does not by itself prove that the selected check covers every requirement. The agent must inspect the actual target, evidence and review, and distinguish a verified result from permission to ship it.

For new Standard or Critical workflows using the execution core, `gate` includes the independent reviewer’s actual overall disposition in its assessment. A missing or unverified disposition cannot produce an eligible review; a blocked disposition blocks when it applies to the current target and intent. The gate does not authenticate the supplied records or start work.

Execution-core intent and criterion fingerprints use a new version to prevent numeric precision loss from making different declarations appear identical. Existing v1 bindings need the actual intent, evidence and applicable review to be re-established; keep the old records for reference. See the [execution core guide](.apm/skills/xtack-voyage/scripts/README.md) for the migration and numeric-input limits.

## Goals and resuming work

Voyage can define an outcome and completion criteria, break a large goal into verifiable units, coordinate their dependencies and reassess progress as the work changes. When a verified unit supports only part of a criterion, its permitted evidence can be linked while the whole criterion remains pending or unverified. Where the user permits storage, it can maintain a local goal record with the request, constraints, units, evidence references and status. The record is optional: if authorized storage is unavailable, the agent should continue in the session where possible and report the recovery gap. A review-only request does not by itself authorize a record.

A record does not wake the agent or start another session. To resume explicitly, provide the record's directory and the goal ID and revision you previously observed:

```text
$xtack:xtack Continue the unfinished goal in <goal-directory>.
Its previously observed goal ID is <goal-id> and revision is <revision>.
Reassess the current target and available evidence, then continue the original outcome within its existing constraints.
```

This example uses the native Codex plugin. With an APM source install use `$xtack`; in Claude Code use `/xtack:xtack` for the native plugin or `/xtack` for an APM source install. Start the new session yourself or through your host's own scheduling capabilities; the record does not trigger it.

Use observed values and omit an unknown ID or revision rather than guessing. For a relative goal path, also preserve the observed working directory and exact path string; normalizing `..` can change its meaning when symlinks are involved. Without independent anchors, continuity can remain unverified. A later session needs access to the record and evidence; a generic description alone may not identify a result that can be reopened. Neither the record nor a matching ID authenticates its contents. The agent must reassess the current state and evidence rather than treating a saved completion claim as proof.

The goal store rejects revision numbers whose original JSON spelling loses precision when parsed. If an externally created or modified history is rejected, preserve its original files and inspect the reported revision before recovery; do not rewrite its hash-linked history automatically. Earlier rounding that was already saved as a canonical integer cannot be detected from that record alone.

The bundled execution core and goal store require Node.js. Creating or updating a goal record also requires a permitted directory on a filesystem that supports hard links. If the store cannot be used, the agent can continue in the session and report that progress cannot be recovered from a goal record. Checking requested GitHub CI additionally requires an authenticated `gh` CLI and network access.

When retaining a core command receipt, optional `run --receipt <new-path>` exclusively creates a new file before starting the command, helping preserve earlier receipts. Use a permitted path outside the hashed target; see the [capture guide](.apm/skills/xtack-voyage/scripts/README.md#capture-original-output) for failure and recovery limits.

Goal records retain request details across revisions and may contain sensitive information. Choose a location within the user's permitted boundaries, minimize retained content, and consider the full history. Xtack does not change ignore rules for a goal. If a retention restriction cannot be respected, the agent should use an allowed alternative and report any recovery gap. Host transcripts and logs have their own retention behavior.

## Installation

### Native marketplace plugin

When the marketplace indexes and bundle are available on the selected repository branch:

```sh
# Claude Code
claude plugin marketplace add oognuyh/goodies
claude plugin install xtack@goodies

# Codex
codex plugin marketplace add oognuyh/goodies
codex plugin add xtack@goodies
```

Start a new session and invoke `/xtack:xtack` in Claude Code or `$xtack:xtack` in Codex. Remote marketplace installation has not been verified end to end. Local installations and invocations have been observed, but those checks do not establish behavior for every host configuration or task.

### APM source installation

With APM 0.29.0 and a local checkout, run one command in the project that will use the skills:

```sh
apm install /absolute/path/to/goodies/plugins/xtack --target claude --no-trust-bin
apm install /absolute/path/to/goodies/plugins/xtack --target codex --no-trust-bin
```

APM installs individual project skills (`.claude/skills/` or `.agents/skills/`), not a namespaced plugin. Start a new session and use `/xtack` in Claude Code or `$xtack` in Codex; specialists use their individual names, such as `$xtack-trace`. APM may initialize or update the project's manifest, lockfile and `.gitignore`; review those changes. This local source is recorded using an absolute path, which needs updating if the checkout moves or is unavailable to another user.

Installation route, host options and permissions affect discovery, reference access, subagents and session resumption. For example, restricted Claude Code sessions have differed from normal sessions in skill discovery and reference access. Check the actual environment you intend to use. An individually installed skill cannot assume the other specialists are present.

For a local Claude plugin trial, run `mise run pack` at the repository root, start Claude Code with `--plugin-dir /absolute/path/to/goodies/build/marketplace/plugins/xtack`, then invoke `/xtack:xtack`.

To use Claude Code with OpenCode Go models, follow [OpenCode's Claude Code setup](https://opencode.ai/docs/console/harnesses/claude-code/#go) for its Go base URL, API key, and model aliases. Verify the active provider and model in Claude Code before a task; configure the aliases used by background agents as well as the main model. This selects the provider for that Claude Code session, not for a separate Codex session. Model availability and Go usage limits are described in the [OpenCode Go guide](https://opencode.ai/docs/console/go/).

## Boundaries and host controls

The requested scope governs the work: a diagnosis does not authorize a fix, and a plan does not authorize implementation. The agent should proceed autonomously within that scope and report genuine blockers or missing authority. Xtack's instructions, optional local scripts and review records do not enforce a filesystem boundary or prevent all out-of-scope reads and writes. Configure and validate the host's sandbox, permissions and any hooks for your environment; a prompt or an isolated working copy alone does not establish an enforced boundary. Host tools, connectors and network access may need separate controls.

Xtack does not provide automatic background continuation. Delegation guidance also does not enforce host calls or costs; inspect agent activity and actual reviewer responses when those matter. Local scripts can help capture execution and assess evidence, but do not authenticate claims or override host permissions.

## Further details

- [Execution core guide](.apm/skills/xtack-voyage/scripts/README.md): command execution, snapshots, evidence, reviews and compatibility limits.
- [Goal store guide](.apm/skills/xtack-voyage/scripts/GOAL.md): goal records, resume anchors, updates and examples.
- [Voyage policies and playbooks](.apm/skills/xtack-voyage/references/policies/risk-and-approval.md): risk and review guidance; [bugfix](.apm/skills/xtack-voyage/references/playbooks/bugfix.md), [feature](.apm/skills/xtack-voyage/references/playbooks/feature.md), [refactor](.apm/skills/xtack-voyage/references/playbooks/refactor.md) and [investigation](.apm/skills/xtack-voyage/references/playbooks/investigate.md) workflows.
- Host guidance: [Codex](.apm/skills/xtack-voyage/references/adapters/codex.md) and [Claude Code](.apm/skills/xtack-voyage/references/adapters/claude-code.md). These are agent instructions, not executable adapters.
- Evaluation in this repository: [runtime checks and schema conformance](../../evals/xtack/runtime/README.md), [dependency and resume observations](../../evals/xtack/dependency-resume/README.md), and [interruption experiments](../../evals/xtack/interruption/README.md). Structural checks do not establish agent behavior; inspect real task results and evidence as well.

Contributors edit `.apm/skills/` and run `mise run pack` and `mise run check` from the repository root. Generated bundles are built from the source rather than edited directly.
