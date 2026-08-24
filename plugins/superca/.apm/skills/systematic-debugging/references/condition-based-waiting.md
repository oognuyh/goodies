# Condition-Based Waiting

Read for race-prone tests or workflows waiting for asynchronous completion.
Replace guessed delays with the actual event, state, count, or artifact condition.
Use an existing test-runner wait helper before adding another poller.

```typescript
// Observe current state on every check, rather than capturing a stale value.
await waitFor(() => getResult() !== undefined);
expect(getResult()).toEqual(expected);
```

Every wait needs a bounded timeout and a failure identifying the missing
condition. Choose a polling interval that avoids busy-spinning and fits the
system's timing; the bundled example uses 10 ms, not a universal requirement.
Read [condition-based-waiting-example.ts](../scripts/condition-based-waiting-example.ts)
only when an existing helper is unavailable or domain-specific event matching
is needed; it implements `waitForEvent`, `waitForEventCount`, and
`waitForEventMatch`.

A fixed delay is appropriate when timing itself is the behavior under test,
such as debounce/throttle intervals or periodic partial output. First observe
its triggering condition, derive the delay from the specified interval, and
record why it is necessary. A sleep alone does not establish readiness.
