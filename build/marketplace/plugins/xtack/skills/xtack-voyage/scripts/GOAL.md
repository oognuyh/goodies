# Voyage goal store

`voyage-goal.mjs` accepts one UTF-8 JSON object on stdin. `file` identifies a goal **directory**, not a JSON file. Set `VOYAGE_STORE` to this installed skill's `scripts/voyage-goal.mjs`. The store needs Node.js; creation and updates require filesystem hardlink support; it does not schedule a turn, enforce permissions, authenticate records or prove a check. Inputs and each saved revision are limited to 4 MiB. An oversized input can close the pipe early; check the store's actual exit and error. An input exactly at the limit still needs EOF.

All record fields can retain text. If an excluded value cannot be kept out by an independently effective control, do not use the free-text store for that write. Continue permitted work in session state and report any recovery gap. Host transcripts and tool logs have separate retention. Never delete, overwrite or silently migrate an existing goal, incomplete history or temporary artifact to make an operation succeed.

## Create and recover

Choose a goal directory inside the permitted boundary that does not yet exist; its parent must already exist. Serialize and shell-quote actual task values safely. The example literals below are placeholders; use the real request, constraints, criteria and units. Check the CLI exit status before relying on its output; inspect the write response's `durability` and report when `unverified` means durability is not established; if a wrapper or write fails after the store may have run, inspect the same goal before retrying.

```sh
VOYAGE_STORE="/absolute/path/to/xtack-voyage/scripts/voyage-goal.mjs"
printf '%s\n' '{
  "file": "/permitted/path/filter-goal",
  "original_request": "Fix the filter",
  "constraints": ["Preserve existing filters"],
  "criteria": [{"id":"AC1","description":"Combined filters work","status":"pending","evidence_ids":[]}],
  "units": [
    {"id":"U1","outcome":"Identify the failure","status":"pending","criterion_ids":[],"depends_on":[]},
    {"id":"U2","outcome":"Correct and verify filtering","status":"pending","criterion_ids":["AC1"],"depends_on":["U1"]}
  ],
  "evidence": []
}' | node "$VOYAGE_STORE" create
```

Capture the returned `record.goal_id` and `record.revision`. For a later session identify this goal explicitly, never the newest by guess. Supply independently observed anchors when available; omit unknown anchors rather than inventing them. If the goal ID was not independently observed, report that identity continuity is unverified. A matching ID or hash does not authenticate the record or prove history is complete.

```sh
printf '%s\n' '{"file":"/permitted/path/filter-goal","goal_id":"OBSERVED-ID","minimum_revision":1}' | node "$VOYAGE_STORE" show
```

`include_locator: true` can return the supplied file string and, for relative paths, its working directory when permitted; it is a hint, not authentication. Preserve the exact file string and cwd: normalizing `..` can change path meaning. Use the [full reference](GOAL-REFERENCE.md) for locator disclosure, symlinks, Windows paths, old versions, incomplete history or failed/uncertain writes. If the record or store is unavailable or forbidden, continue authorized work in session state and report that recovery is not assured.

## Update and complete

Use the actual current ID and revision, and reconcile against a fresh `show` after conflicts. Arrays in `changes` replace whole arrays: retain unrelated criteria, units, evidence and links. Constraint changes require actual user `steering` as a nonempty string at the top level of the update request; do not invent steering. An `update` to a completed goal first needs an explicit `status: "active"` or `"blocked"` to reopen it.

```sh
printf '%s\n' '{"file":"/permitted/path/filter-goal","goal_id":"OBSERVED-ID","expected_revision":1,"changes":{"status":"blocked"}}' | node "$VOYAGE_STORE" update
```

`changes` may contain `constraints`, `criteria`, `units`, `evidence` or `status`. Criteria have `id`, `description`, `status` (`pending`, `met`, `unmet`, `unverified`) and `evidence_ids`. Units have `id`, `outcome`, `status` (`pending`, `in_progress`, `completed`), `criterion_ids` and `depends_on`; references must exist and dependencies must be acyclic. Evidence has `id`, `description` and an actual `reference`. The store checks recorded dependency statuses, not whether evidence proves a unit or the real edit order.

Changing definitions, referenced evidence or steering can require reassessment: inspect the returned record, retain prior evidence, and re-establish claims only from applicable actual observations. The store may reset criteria and units; newly starting or completing a unit with an incomplete prerequisite is rejected. Changing only a prerequisite status to pending or in_progress does not automatically reassess dependants: reset any started or completed dependants to pending in the same update. Otherwise the store rejects the update without publishing the invalid revision. Earlier versions can require callers to reset affected units explicitly even when reassessment occurs. Before changes to definitions, steering, referenced evidence or prerequisites, consult the relevant [reassessment details](GOAL-REFERENCE.md#update-and-complete). Before completion, consult them if retention or recovery of the final revision, a known boundary violation, or a difference between a product gate and the goal requirements matters. Reuse still-valid checks; do not manufacture evidence or rerun solely to recreate a receipt.

A completed goal needs met criteria with identified evidence and completed, linked units. Those structural checks do not establish factual completion or independent review. Compare the original request and any steering against actual current evidence and required review; an unmet or unverified requirement prevents completion. For new Standard/Critical core workflows use `gate` and the actual independent reviewer disposition; its `assessment` of `unverified` or `blocked` prevents completion until its reasons are resolved. A product-only gate does not prove separate retention requirements. Report actual results, gaps and last observed goal identity/status when work stops.

The full [goal store reference](GOAL-REFERENCE.md) preserves the field examples, compatibility, path, concurrency, retention, recovery and reassessment details. Consult the relevant part when those conditions apply. Run `node "$VOYAGE_STORE" --help` or `show --help` / `update --help` for the CLI summary; operation output and errors are JSON. Neither ID matching nor the revision chain proves authenticity or that the latest history is intact.
