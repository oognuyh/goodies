# Goodies

Agent skills and plugins for Claude Code and Codex, covering Korean writing,
terminal-friendly diagrams, and software development workflows.

## Plugins

| Plugin | What it does | Requirements |
| --- | --- | --- |
| [Skills](plugins/skills/README.md) | Korean writing and technical documentation, plus Mermaid diagrams rendered as text. Includes `cheolsoo`, `asd-stk100`, and `unimaid`. | Python 3 for ASD-STK100's style checker; Node.js for Unimaid. |
| [Superca](plugins/superca/README.md) | Development workflows for planning, implementation, review, and project documentation, with supervised execution through Orca. | Orca CLI and runtime for workflows that change code, documentation, or lifecycle state. |
| [Xtack](plugins/xtack/README.md) | Outcome-led engineering workflows with specialist routing, verification, and coordination of larger goals. | Node.js for the execution core and persistent goal records. |

## Installation

Add the marketplace, then install the plugin you want:

```sh
# Claude Code
claude plugin marketplace add oognuyh/goodies
claude plugin install skills@goodies
# Or: claude plugin install superca@goodies
# Or: claude plugin install xtack@goodies

# Codex
codex plugin marketplace add oognuyh/goodies
codex plugin add skills@goodies
# Or: codex plugin add superca@goodies
# Or: codex plugin add xtack@goodies
```

Start a new session after installation so the host can discover the plugin.
Marketplace installation requires the indexes and plugin bundles on the chosen
branch. The CLI syntax has been checked, but remote installation has not been
verified end to end. See each plugin's README for individual skill installation,
requirements, and host-specific details.

## Getting started

Ask your agent for an outcome or invoke a skill explicitly. Invocation syntax
varies by host.

```text
Use cheolsoo to polish this Korean notice without changing its conditions:
"신청 기간은 10월 1일까지이며, 신청자는 사전 등록을 진행해야 합니다."
```

```text
Use asd-stk100 to translate this API guide into Korean while preserving its
conditions and code examples.
```

```text
Use unimaid to show this diagram as text:
flowchart LR
  A[Request] --> B[Validate] --> C[Response]
```

```text
Use helm to add CSV export to this project. Preserve the existing API,
verify the behavior, and update any affected project documentation.
```

```text
Use xtack to reproduce the duplicate notification, fix it, and verify the result.
```

See the [Skills guide](plugins/skills/README.md) for individual skills and the
[Superca guide](plugins/superca/README.md) for its lifecycle and Orca setup. The
[Xtack guide](plugins/xtack/README.md) covers its skills, goal recovery, and
host-specific invocation.

## Development

Plugin sources live under `plugins/<name>/.apm/`; each package has its own
`apm.yml`. This repository uses [APM](https://github.com/microsoft/apm) and
pins its tool versions in [mise.toml](mise.toml). From the repository root:

```sh
mise install
mise run pack
mise run check
```

Edit source files rather than generated marketplace indexes or bundles. Pull
request CI checks the build; branch CI rebuilds and syncs the distribution on
`main` and `develop`. See [AGENTS.md](AGENTS.md) for contributor guidance.

## License and attribution

Packages declare the MIT license. Superca includes material derived from other
projects; see its [license and attribution notice](plugins/superca/.apm/skills/using-superca/LICENSES/NOTICE.txt).
Unimaid's renderer attribution is in its [license file](plugins/skills/.apm/skills/unimaid/LICENSES/grok-mermaid.txt).
