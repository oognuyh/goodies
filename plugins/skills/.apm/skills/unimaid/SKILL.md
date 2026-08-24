---
name: unimaid
description: Use when the user asks to show a Mermaid diagram directly in terminal or TUI output, or explicitly invokes unimaid or grok-mermaid.
---

# Unimaid

## Overview

Run the bundled Unimaid CLI against raw Mermaid source and return its plain stdout. It requires Node.js but no package installation.

## Workflow

1. Write or extract raw Mermaid source without Markdown fences.
2. Resolve `scripts/unimaid.mjs` relative to this `SKILL.md`; do not assume a working directory or installation root.
3. Use the requested width, or `${COLUMNS:-100}` when none is given.
4. Run the bundled CLI with the resolved absolute path:

   ```bash
   script="/resolved/path/to/unimaid/scripts/unimaid.mjs"
   width="${COLUMNS:-100}"
   node "$script" --width "$width" <<'EOF'
   flowchart LR
     A[Request] --> B[Validate] --> C[Response]
   EOF
   ```

5. Include stdout in the final response inside a plain-text code fence. If stderr reports a source fallback, briefly report the reason but keep stdout as the displayed result.

## Quick reference

- Supported diagrams: flowchart, state, class, ER, and sequence
- Unsupported or unrenderable input: Mermaid source-box fallback on stdout
- File input: `node "$script" --width "$width" diagram.mmd`
- Stdin input: omit the file or use `-`
- Options: `node "$script" --help`

## Common mistakes

- Pass raw Mermaid, not its surrounding Markdown fence.
- Resolve the script relative to this skill instead of using a fixed home-directory path.
- Preserve source-box stdout when the diagram cannot be rendered.
- Do not add ANSI styling or install packages at runtime.

## Attribution

Bundled renderer: [`grok-mermaid` v0.2.3](https://github.com/xl0/grok-mermaid), licensed under Apache-2.0. See `LICENSES/grok-mermaid.txt`.
