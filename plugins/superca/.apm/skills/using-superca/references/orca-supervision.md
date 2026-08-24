# Supervision Procedure

Read before the first worker preparation, including read-only review/Council
workers. The [execution contract](orca-cli.md) owns Run/Task identity and
acceptance; [Worker Launch](orca-worker-launch.md#worker-launch) owns launch
mechanics. Keep reconciliation in the root's reasoning, not a shell decision loop.

## Establish Collection

Before terminal preparation, recover/create one root-owned coordinator Task and
start one read-only collector using [Supervisor-Owned Polling](orca-polling.md).
Use the host's nonblocking shell session and retain its supported read/stop handle.
A disclosed bounded-foreground fallback applies when sessions cannot be retained.

Record in the coordinator Task: Objective/plan pointer, verified coordinator,
launch configuration/evidence, polling handle, last successful sample, last root
interpretation, next checkpoint, and next operation. Checkpoint bootstrap, state
changes, recovery, and handoff rather than unchanged samples. `--result` replaces
the result: merge updates/final outcome into the existing JSON with a reader/encoder
and preserve nested launch/ownership proof. A parse failure requires recovery,
not an empty replacement. A dispatched worker Task cannot hold this record because
dispatch/completion replace its result. The collector creates no Dispatch or
storage-only Task.

Collection targets approximately 30 seconds from cycle start, independently of
model reasoning or startup/recovery calls. Root interpretation targets the same
cadence whenever preparation/recovery is pending, a Dispatch is live, or a Delivery
is expected. Events do not restart either deadline. One foreground call, including
chained waits, must yield by the next observation checkpoint.

## Reconcile, Act, And Continue

1. **Observe.** Drain the collector; read and ACK complete Deliveries through
   [Delivery Checks](orca-cli.md#delivery-checks). Record actual root interpretation
   times. Address questions, errors, pressure, and changed worker state before
   unrelated work. If observations are stale, clipped, partial, or collection
   failed, take a direct complete Task/worker/pressure sample. Hold admission
   while capacity or ownership is unknown. Reconcile an old collector's outcome
   before replacing it.

2. **Choose one operation.** Compare ready dependencies, capacity, ownership,
   and the plan. Record why held Tasks wait. Before `worker-start` or eligible
   review-only `dispatch --inject`, reconcile again and require effective
   model/profile/skills/permissions under Worker Launch. Prepare one terminal,
   observe a pending call, submit one startup probe, check readiness, attach one
   Task, or reconcile one failure; then return to step 1, including after early
   yield. Save pending receipts/session handles. Probe and collector sessions are
   separate; reading one does not drain the other.

   Immediately after a launch receipt, record its time and take a complete
   Task/worker/pressure observation before `worker-show`, terminal inspection,
   or provider/model checks. A pre-launch periodic sample does not substitute.

3. **Track individual progress.** Use bounded `worker-show`/`worker-read` at
   each worker's checkpoint. Compare output/artifacts with prior evidence and
   the injected heartbeat cadence; liveness/heartbeat alone is not progress.
   A busy worker must not hide a quiet sibling. For a prompt or failure, use the
   launch reference's recovery section without abandoning whole-Run observation.

   When idle, retain the root turn with one bounded wait:

   ```bash
   orca orchestration check --run <run_id> --terminal <verified_terminal_handle> --wait --timeout-ms 5000 --json
   ```

   Shorten it to the remaining response budget; use nonblocking `check` when
   anything is due. Return to the model after that single wait; do not batch
   waits until a Delivery arrives. A progress briefing does not end supervision.
   After model/tool latency or compaction, reconcile immediately and record
   actual delay; text cannot guarantee model response latency.

4. **Settle and accept.** ACK complete Deliveries promptly while retaining the
   settled terminals. Keep results pending acceptance while siblings are live;
   long verification, edits, documentation repairs, and record-writing wait
   until the wave settles. Then verify decisive evidence and independent review
   against the actual artifact before dependent work relies on them, even if
   `worker_done` already completed a Task. Rerun full verification only for
   missing, contradictory, or insufficient evidence. Reconcile failed attempts,
   dispose of accepted resources, remeasure capacity, and reconsider held work.

5. **Advance or close.** Continue independent authorized work around a scoped
   Gate or bounded recovery. Before closing the coordinator Task or reporting
   completion, nonblocking `check` this Run/root, fully read and ACK each batch,
   and recheck until empty. Record receipt/acceptance/resource reconciliation
   while preserving the coordinator's launch/ownership proof.

When no startup/recovery, live Dispatch, or expected Delivery remains, local work
does not require periodic root interpretation. Collection may remain alive;
reconcile before the next launch or close.

## Recovery, Evidence, And Cleanup

After context loss, recover the bound Run, coordinator Task, pending receipts,
and polling session before mutation. Prove session identity/liveness through the
host's session/output surface, not a process-name match. If gone, record the
uncovered interval and start one replacement; reconcile unknown outcomes first.

Report collection gaps separately from root interpretation/response delays,
covering preparation/recovery and every execution window from launch request
through settlement/Delivery consumption. Include model/API errors and compaction
gaps. Missing timing evidence is an explicitly unmeasured named interval;
timestamps collected but unread by the root establish collection only.

Before completion, pause/cancel, or blocking handoff, reconcile owned workers and
Deliveries, preserve the next action, and stop only this Run's owned collector
through its supported stop/interrupt surface. Confirm exit/liveness separately
from buffered stdout so clipping cannot hide it. A global process cleanup is not
scoped ownership. A forced root turn end suspends supervision even if collection
continues; disclose and recover on resume.
