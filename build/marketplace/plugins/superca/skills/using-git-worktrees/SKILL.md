---
name: using-git-worktrees
description: Use when mutation work needs an isolated checkout.
---

# Using Git Worktrees

Use Orca-managed checkouts for this workflow; Orca owns placement, lineage,
and selector state.

Before mutation, read the shared [Prerequisites](../using-superca/references/orca-cli.md#prerequisites).
Resolve the current checkout with:

```bash
orca worktree current --json
```

Reuse it if already suitable. Otherwise create the isolated checkout through
`orca worktree create --json`, using the installed schema's arguments. Keep its
selector with the Run and Task context so workers use the same checkout. Continue
setup and the plan's baseline verification there.

If Orca cannot provide a managed checkout, report the blocker; do not substitute
an unmanaged checkout or reconstruct lifecycle state in local scripts.
