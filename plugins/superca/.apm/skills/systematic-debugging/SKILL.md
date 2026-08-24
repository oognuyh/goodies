---
name: systematic-debugging
description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
---

# Systematic Debugging

Investigate the root cause before proposing a fix. Complete these phases in order;
a plausible symptom-level explanation is not confirmation.

## 1. Locate the Failure

- Read the full error and stack trace; record exact steps, inputs, expected and
  observed results. If reproduction is intermittent, gather evidence rather
  than guessing.
- Inspect recent code, dependency, configuration, and environment changes.
- For a multi-component failure, observe the relevant input, output, state, and
  configuration propagation at each boundary. Use bounded diagnostic
  instrumentation to locate the failing component before changing behavior;
  check secret presence without printing values.
- Trace a bad value back through callers to its source. For a deep stack or an
  unknown originating caller, read
  [root-cause-tracing](references/root-cause-tracing.md).

## 2. Compare Working and Failing Paths

Find a working equivalent in the codebase. Read the relevant reference
implementation completely before applying its pattern. Compare configuration,
dependencies, state, and assumptions; do not dismiss a difference without evidence.

## 3. Test One Hypothesis

State the proposed cause and supporting evidence. Test it with the smallest
change or probe, varying one factor at a time. If the result refutes it, form
a new hypothesis instead of stacking speculative fixes. State remaining unknowns
and investigate them; ask only when missing human knowledge prevents progress.

## 4. Fix and Verify

1. Create the smallest failing regression test using
   [test-driven-development](../test-driven-development/SKILL.md); use a one-off
   executable reproduction when no framework exists.
2. Fix the demonstrated cause without unrelated refactoring.
3. Verify the original symptom and project tests using
   [verification-before-completion](../verification-before-completion/SKILL.md).
4. If the fix fails, return to the evidence. After **three failed fixes**, stop
   before a fourth and reassess the architecture: repeated failures across
   shared state, changes requiring broad refactoring, or new symptoms elsewhere
   may indicate a structural problem. With Helm, route an ADR-grade choice through
   `decision-council`; the root decides within delegated scope. Without Helm,
   present architectural options to the human before more fixes. Escalate
   human-owned choices under either path.

If investigation supports an environmental, timing-dependent, or external cause,
record what was inspected and what remains uncertain, then add appropriate
handling and observability. Difficult local reproduction alone does not establish
an external cause.

## Conditional Techniques

Read only when the failure needs the technique:

- [defense-in-depth](references/defense-in-depth.md): the root cause is known and
  the same invalid state can cross multiple boundaries.
- [condition-based-waiting](references/condition-based-waiting.md): a test or
  workflow relies on an arbitrary delay or race-prone wait.

`references/test-*.md` and `references/CREATION-LOG.md` are maintainer evaluation
material; they are not steps in a debugging session.
