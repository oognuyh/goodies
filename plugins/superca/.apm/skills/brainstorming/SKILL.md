---
name: brainstorming
description: Use when designing a new feature, project, subsystem, or behavior change before implementation.
---

# Brainstorming

Use the request and repository context to establish the intended outcome, users,
constraints, and success criteria. Ask one focused question at a time only for
missing information that changes the design; do not ask again for supplied
purpose or constraints. Reflect the brief concisely, distinguish assumptions,
invite correction, and carry that understanding into the design artifact.

## Classify Before Designing

Announce the selected path before your first question so the user can correct it.

| Path | Qualification | Required artifact and boundary |
| --- | --- | --- |
| Spike | A feasibility question whose output is an answer | Present the question and probe in 2–3 sentences; obtain approval, investigate, and report a recommendation. Label any code throwaway; keeping it requires a newly classified task. |
| Bounded | A well-scoped change to an existing repository flow | Inspect that flow, ask material questions, and present the approach, affected files, and checks in chat. Obtain design approval before implementation; no spec or plan file. |
| Architectural | A new project/subsystem, restructured composition, or changed shared interface | Read [architectural design](references/architectural-design.md), then complete the written-spec and plan handoffs. |

App familiarity does not make a new project bounded: there must be an existing
flow to inspect. When uncertain, use the heavier path. If hidden complexity
requires an upgrade, stop and announce it; do not downgrade mid-task. Decompose
independent subsystems before refining a spec that is too large for one plan.

## Approval and Implementation Gate

Without root Helm, the human approves each stage. With Helm, the Supervisor
approves routine delegated stages. Potential ADR-grade or human-owned decisions
follow [decision-council](../decision-council/SKILL.md); routine design approval
needs no Council. Approval does not remove artifacts or self-review.

Before product code, scaffolding, dependency installation, external project
creation, or an implementation skill:

- **Spike:** approval covers the question and probe.
- **Bounded:** approval covers the presented in-chat design.
- **Architectural:** approval covers the written spec, followed by the reviewed
  plan and execution handoff under `writing-plans`.

Approval covers the stage actually presented, not a future artifact. Conversational
approval permits writing the architectural spec; written-spec approval permits
`writing-plans`, which is the only next skill on that path. Resume at the earliest
incomplete stage. Read-only exploration may continue while approval is pending.

Bounded work proceeds through normal development and TDD after design approval;
a spike ends with its recommendation.

## Visual Questions

When a question first needs a visual comparison, read the offering instructions
in [visual-companion](references/visual-companion.md). Offer it in its own message
and wait for user acceptance before starting it. Do not offer it upfront or for
text-only requirements and tradeoffs. Read the remaining setup/use details only
if the user accepts; reassess whether a visual helps on each question.
