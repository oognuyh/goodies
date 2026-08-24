# Skills

A collection of Agent Skills for Korean writing and terminal-friendly Mermaid diagrams. The planned repository is [oognuyh/goodies](https://github.com/oognuyh/goodies). This repository packages the skills together as the `skills` plugin; each skill can also be installed separately.

## Included skills

| Skill | Use it for | Requirements |
| --- | --- | --- |
| [Cheolsoo (`cheolsoo`)](.apm/skills/cheolsoo/SKILL.md) | Drafting or polishing Korean prose, or explicitly requesting Cheolsoo for a Korean response | Instruction-only; no executable dependency |
| [Unimaid (`unimaid`)](.apm/skills/unimaid/SKILL.md) | Displaying a Mermaid diagram as text in a terminal or agent response | Node.js to run the bundled CLI; no package install at runtime |

Cheolsoo helps preserve facts and intent while adapting Korean prose to its audience and purpose. It does not automatically govern every Korean-language conversation. Unimaid renders **text, not image pixels**; when it cannot render a diagram, it displays the Mermaid source in a box.

## Usage

These are example requests to an agent. Explicit skill invocation syntax may differ between hosts.

```text
Use cheolsoo to polish this Korean notice without changing the date or conditions:
"신청 기간은 10월 1일까지이며, 신청자는 사전 등록을 진행해야 합니다."
```

```text
Draft a two-sentence certificate-expiration notice in Korean for new users.
The notification is sent seven days before expiration.
```

```text
Use unimaid to show this Mermaid diagram in the terminal:
flowchart LR
  A[Request] --> B[Validate] --> C[Response]
```

Unimaid resolves its bundled script relative to the installed `SKILL.md`, not the current working directory, and does not install packages when it runs.

## Installation

### Install the plugin from GitHub

The repository [`apm.yml`](../../apm.yml) registers one `skills` package in the `goodies` marketplace. **Cheolsoo and Unimaid do not need separate marketplace entries.** Once the repository's marketplace distribution has been published, use the commands for your host:

```sh
# Claude Code
claude plugin marketplace add oognuyh/goodies
claude plugin install skills@goodies

# Codex (alternative to Claude Code)
codex plugin marketplace add oognuyh/goodies
codex plugin add skills@goodies
```

The `main` branch must contain both marketplace indexes (`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`) and their referenced bundle (`build/marketplace/plugins/skills`). [Branch CI](../../.github/workflows/ci.yml) builds and commits these generated files on pushes to `main` and `develop`; wait for its distribution-sync commit before installing from GitHub. CLI syntax has been checked, but the remote installation has **not** been tested end to end.

### Install an individual skill

A marketplace is not required to use a skill alone. Install the complete [`cheolsoo`](.apm/skills/cheolsoo/) or [`unimaid`](.apm/skills/unimaid/) directory into a skill location supported by your agent. Keep its `SKILL.md` and any bundled `references/`, `scripts/`, or `LICENSES/` together.

To install from the repository without the marketplace, point the Skills CLI at the source skill directory on `main`:

```sh
npx skills@1.5.23 add https://github.com/oognuyh/goodies/tree/main/plugins/skills/.apm/skills --list
npx skills@1.5.23 add https://github.com/oognuyh/goodies/tree/main/plugins/skills/.apm/skills --skill cheolsoo
```

The source directory was checked locally and contains both skills; remote installation has **not** been tested yet. The destination and invocation method depend on the agent host.

## Development

Edit the sources in [`.apm/skills/`](.apm/skills/), not the generated `build/` directory. From a local checkout, run `mise run pack` and `mise run check` at the repository root. Pull-request CI verifies the distribution; pushes to `main` or `develop` also commit the generated marketplace indexes and bundles. The [tag release workflow](../../.github/workflows/release.yml) archives those already-committed bundles as ZIP assets; it does not publish the branch marketplace distribution. Packaging checks do not measure writing or rendering quality, so validate each skill against representative tasks as well.

For the bundled Mermaid renderer's license, see [Unimaid's attribution file](.apm/skills/unimaid/LICENSES/grok-mermaid.txt).
