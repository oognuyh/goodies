# Writing Good Tests

Read before writing or changing tests, mocks, or test helpers.

## Choose a Failure the Test Can Catch

Before writing the body, name the production change that should make the test
fail, and why that change would be a bug. Use an observable boundary outcome:
wrong branch, missing side effect, wrong argument, validation, or broken contract.
Private structure, constants, and exact wording earn checks only when their
value is itself an approved external contract. Otherwise test the behavior
that depends on them.

Derive expectations independently with literals or hand-checked fixtures.
Expected values computed by the code under test or its helpers can reproduce
the same defect on both sides of the assertion.

```typescript
// Same builder on both sides cannot expose its own wrong result.
const expected = buildSearchQuery({ tag: 'urgent' });
expect(buildSearchQuery({ tag: 'urgent' })).toBe(expected);

// Independently derived contract result.
expect(buildSearchQuery({ tag: 'urgent' })).toBe('tag:"urgent"');
```

Run scripts against controlled inputs and assert outputs, side effects, and exit
codes. For agent instructions, evaluate the consuming agent's behavior; matching
source wording does not establish behavior. Human prose needs no source-text test.

Test your boundary contract, not documented upstream mechanics. A narrow
characterization test is justified when a dependency's observed behavior makes
an otherwise uncertain assumption material. Constructors, getters, forwarding,
and private helpers need separate coverage only when they enforce or transform
behavior; otherwise check the first consumer-visible result.

## Keep the Relevant Behavior Real

Before mocking a dependency, identify its real side effects. Mock only the slow
or external boundary while keeping state and behavior the assertion depends on
real. If uncertain, run against the real dependency to establish what it does.
A mock that swallows a configuration write can invalidate downstream duplicate
checks even while the test passes.

Assert the real component's result rather than the existence of a mock. When
arguments, counts, or ordering are contractual, assert them: a permissive fake
that accepts the wrong call proves little. Use distinct success/error/malformed
fixtures so the wrong branch cannot satisfy the expectation. Responses should
mirror the real documented structure, not omit fields downstream code may read.

Keep test-only cleanup and helpers in test utilities. A production lifecycle
method is justified by the resource the class actually owns, not by a test's
need to reset it. When mock setup dominates the test or misses real component
methods, prefer an integration test with real components.

## Check Coverage by Mutation

For each realistic wrong argument/constant, branch, missing side effect, empty
return, or invalid/unauthorized input, identify a test that would fail. If none
would, the behavior is unprotected or the assertion is tautological. Add only
coverage that catches a meaningful break; trivial code and prose need none.
