# Plan Format

Read when writing an implementation plan. Start every plan with:

```markdown
# [Feature Name] Implementation Plan

> **For the root executor:** Use executing-plans or subagent-driven-development to supervise this plan. Task workers read the plan and linked spec, then execute only their assigned Task packet.

**Goal:** [One sentence]
**Architecture:** [Approach in 2–3 sentences]
**Tech Stack:** [Key technologies/libraries]
**Spec:** [Approved spec path and relevant sections; executors read both]
**Durable Documentation Impact:** [Affected files carried from the spec, or "No durable documentation impact."]

## Global Constraints

[Every applicable project-wide requirement with exact values copied verbatim
from the spec: version floors, dependency limits, naming/copy rules, platforms.
Every task implicitly includes these requirements.]

## Review Focus

[Material risks not explicit in the spec, each assigned to an owning task and
check. Omit when none.]
```

Each task uses this shape:

```markdown
### Task N: [Observable result]

**Depends on:** [Task IDs or none]
**Ownership:** [Exact files/modules; shared interfaces when needed]
**Resources:** [light/heavy/exclusive; peak estimate or unknown; contention]
**Context:** [Approved spec sections and current files]
**Acceptance:** [Public behavior and failure boundary]
**Verification:** [Specific red test, green command, and user-path check]
**Progress evidence:** [Expected artifact/checkpoint; next observation deadline]

- [ ] Demonstrate the failing behavior with a test.
- [ ] Implement the minimum passing behavior.
- [ ] Run owning and project checks; record results and commit.
```

State the red–green check once per result; `test-driven-development` owns the
cycle details. Include exact signatures/code only when an ambiguous shared
interface would block an independent worker. Task packets link this plan and
spec without copying them.

A plan is incomplete if it contains TBD/TODO placeholders, vague instructions
such as "add validation" without a failure/check, an unspecified "similar to"
contract, unassigned acceptance criteria, tests unable to expose failure, or
unclear shared ownership. Resolve these before handoff.
