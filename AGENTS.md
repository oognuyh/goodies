# APM authoring guide

This repository uses Microsoft Agent Package Manager (APM) to author agent context, resolve dependencies, deploy primitives to supported hosts, build plugin bundles, and publish marketplace indexes. The APM version is pinned in [`mise.toml`](mise.toml); use the matching official documentation below. This file guides repository contributors, not consumers of an installed plugin.

## Decide where a change belongs

- **Shared repository authoring rule:** put it here. This root `AGENTS.md` is not a substitute for instructions shipped in a package.
- **Behavior needed by consumers:** put it in the relevant package's `.apm/` sources. Keep an individually installable skill self-contained; its required references and scripts belong inside its skill directory.
- **Independent plugin:** create `plugins/<name>/apm.yml` and `.apm/` sources; add the package to the root [`apm.yml`](apm.yml) marketplace. Add a skill to an existing plugin when it does not need a separate distribution or lifecycle. Root marketplace entries need `category` because Codex output is enabled. See [repository layouts](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/repo-shapes.md).
- **Installation or usage guidance:** update the package's `README.md`. Do not put consumer setup instructions in this contributor guide.

## Source layout

```text
apm.yml                               # marketplace and package entries
plugins/<name>/
  apm.yml                             # package metadata, targets, dependencies, scripts
  .apm/
    skills/<skill>/
      SKILL.md                        # required; name and invocation description
      references/ scripts/ assets/   # optional; shipped with the skill
      examples/                      # optional
    instructions/*.instructions.md   # scoped or persistent rules
    agents/*.agent.md                # named specialists
    prompts/*.prompt.md              # explicit prompts / supported-host commands
    hooks/*.json                     # host lifecycle callbacks
```

For APM source installs, MCP servers are declared in `dependencies.mcp` (or `devDependencies.mcp`) in the package manifest, **not** in `.apm/mcp/`. Native plugin bundles need their own MCP payload; this repository's packer does not derive one from `dependencies.mcp`. Verify or extend that export before promising MCP to marketplace consumers. APM commands come from `.apm/prompts/`, not `.apm/commands/`; manifest `scripts` invoked with `apm run` are a separate authoring/automation feature. See [package anatomy](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/concepts/package-anatomy.md) and [skill authoring](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/author-primitives/skills.md) for full layouts and schemas.

## Choose the primitive

| Need | Use | Check before shipping |
| --- | --- | --- |
| Task-specific guidance selected by the agent | Skill (`SKILL.md`) | Specific activation description; bundle references and helpers with the skill. |
| A rule that applies by file or scope | Instruction (`.instructions.md`) | `applyTo` and whether the target needs `apm compile`. |
| A named specialist with a bounded role | Agent (`.agent.md`) | The target's agent support and tool/model field mapping. |
| A workflow the user invokes explicitly | Prompt (`.prompt.md`) | Host-specific command conversion; APM does not deploy prompts/commands to Codex. |
| A lifecycle event callback | Hook (`.apm/hooks/*.json`) | Event names, portable script paths, host support, and side effects. |
| Access to an external tool/server | MCP dependency in `apm.yml` | Credentials, transport, target support, and trust for transitive servers. |

Prefer a skill over a hook or command when the goal is a portable procedure rather than an event callback or command-palette entry. [APM's primitive/target matrix](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/concepts/primitives-and-targets.md) is authoritative for host reach; a successful pack does not prove that a host loads or runs every primitive. Experimental features such as [Copilot canvas extensions](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/integrations/canvas.md) require an explicit compatibility and security review, not a default source layout.

## Choose the APM operation

- **Reuse another package:** declare `dependencies.apm`; use `devDependencies` for author-only tools. Run `apm install` in the owning package and review and commit its generated lockfile; do not edit it or `apm_modules/` by hand. The current [offline packer](tools/package.mjs) omits both when staging native bundles: adding a runtime dependency requires a packaging decision and a test of the resulting payload. See [dependency management](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/consumer/manage-dependencies.md).
- **Choose supported hosts:** set or review the package's `targets:` and preview each needed target. APM source installs and native marketplace plugin installs are different routes; transformations such as hook registration and agent conversion may not survive a bundle-as-APM-dependency install. Inspect the generated bundle and test each required route and host.
- **Deploy vs compile:** `apm install` resolves dependencies and deploys primitives; `apm compile` generates context/rules from instructions and does not install skills, hooks, prompts, or MCP servers. This repository maintains its root `AGENTS.md` and `CLAUDE.md` manually: preview compile output before allowing it to write either file. See [compilation](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/compile.md).
- **Build and publish:** edit source manifests and `.apm/`, not generated indexes or `build/marketplace/plugins/`. Run `mise run pack` and `mise run check` from the repository root; add focused behavior tests and `apm audit` when relevant. Pull requests verify the build; branch CI syncs generated distribution files; release tags archive committed bundles. See [bundle packaging](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/pack-a-bundle.md), [marketplace publishing](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/publish-to-a-marketplace.md), [`tools/package.mjs`](tools/package.mjs), [CI](.github/workflows/ci.yml), and [release](.github/workflows/release.yml).

## Safety and references

Keep secrets out of manifests and hook scripts. Review executable hooks and self-defined MCP servers as trust boundaries; an installed package or a passing structural check is not approval to run them.

- Official authoring: [prompts](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/author-primitives/prompts.md), [hooks and commands](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/author-primitives/hooks-and-commands.md), [MCP](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/author-primitives/mcp-as-primitive.md), [instructions and agents](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/author-primitives/instructions-and-agents.md), [preview and validation](https://github.com/microsoft/apm/blob/v0.29.0/docs/src/content/docs/producer/preview-and-validate.md).
