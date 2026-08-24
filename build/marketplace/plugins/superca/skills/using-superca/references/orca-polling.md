# Supervisor-Owned Polling

Read when starting/replacing collection. The [Supervision Procedure](orca-supervision.md)
owns deadlines, interpretation, Deliveries, and cleanup.

Use the host's nonblocking shell facility and an available shell/JSON reader/
timeout mechanism. Preserve the verified Orca environment and project directory;
retain the returned session handle and supported read/stop operations. No daemon,
helper file, extra agent, or parallel execution ledger is required.

## Inline Collector Contract

1. Sample immediately, then approximately every 30 seconds from cycle start,
   waiting only the remainder after reads. Bound each read; surface timeout/
   failure immediately rather than hanging silently.
2. Read and parse complete successful CLI envelopes:

   | Command | Rows and compact evidence |
   | --- | --- |
   | `orca orchestration task-list --run <run_id> --json` | `result.tasks[]`: `id`, `status`, `deps` |
   | `orca orchestration worker-list --run <run_id> --include-remote --json` | `result.workers[]`: IDs, state, provider, terminal, ownership/disposition, liveness, attention; preserve `result.page` |
   | `orca diagnostics memory --json` | `result`: `collectedAt`, host availability/usage, worktree/session memory and CPU pressure |

   Follow `result.page.nextCursor` unchanged with `--cursor` until `hasMore`
   is false. Derive projections from the returned schema; missing fields or a
   failed page invalidate the whole sample.
3. Emit one compact timestamped whole-Run sample only after all reads/pages succeed.
   Keep every inventory row and pagination evidence; omit verbose histories/specs.
   Read changed-worker details separately.
4. Yield control while collection remains accessible through its handle.

The collector only reads. It does not receive/ACK Deliveries, mutate Tasks/Gates,
dispatch, answer, retry, release resources, or decide completion.

Compare the first sample and first nonempty worker sample with raw identities,
counts, pagination, and host pressure. Empty objects do not identify idle workers;
application memory alone does not measure host headroom. On projection mismatch,
hold admission, observe directly, and repair collection. Use memory or uniquely
owned temporary storage, not shared fixed filenames.

Budget output for complete samples between drains and subsequent reads. Clipping
requires a fresh complete observation and an explicitly unmeasured interval.
Before replacement, reconcile the old handle. If sessions cannot be retained,
use bounded foreground samples and disclose that collection depends on model
execution. Stop/confirm the exact owned session under the supervision procedure.
