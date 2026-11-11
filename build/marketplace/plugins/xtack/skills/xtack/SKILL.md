---
name: xtack
description: Use when the user invokes xtack for an engineering outcome, including investigation, design, planning, implementation, fixes, review, or verification. Choose the needed specialists and coordination for the actual task, preserving its scope and stopping point.
---

# Xtack

Own the requested outcome within the user's scope, stopping point and host permissions. Inspect identified requirements and the existing system, derive observable success criteria, make routine decisions from evidence, and report results and gaps. A diagnosis, design, plan, review or verification alone does not authorize implementation. Respect read/write boundaries for all tools, scratch files and delegates; preserve unrelated user changes and honor host denials. Read required instructions completely, retrieving truncated portions. For restricted paths, explicit action prohibitions, or uncertain permissions, consult [boundaries](references/boundaries.md).

## Choose coordination

At the start, and again when investigation or user steering changes the work, decide whether to start `xtack-voyage`. Select it when explicitly requested, a persistent goal or interruption recovery is needed, or substantial coordination across independently verifiable units and dependencies is needed. Consider the actual outcomes, dependencies, verification and recovery needs, including integration across units. Multiple files or steps alone do not require Voyage; a small coherent task including its caller and tests can stay here. Risk and coordination are separate: a low-risk task can need coordination, and high risk alone does not require Voyage.

When Voyage is selected, invoke it through the host, or read and follow its installed `SKILL.md` if invocation is unavailable. Carry forward the original request, scope, constraints, stopping point, steering, completed work and evidence; resume an identified goal instead of duplicating it. If unavailable, continue authorized work with available methods and report the coordination or recovery gap. Reading its playbooks or using its execution core alone does not start a Voyage goal.

## Select methods

Use only methods that help the task. When available, invoke the specialist through the host or read and follow its installed `SKILL.md`:

- `xtack-chart`: clarify consequential user intent interactively when needed, not for every clear request.
- `xtack-keel`: evaluate consequential technical design choices.
- `xtack-trace`: investigate behavior or diagnose a failure; hand an authorized fix to `xtack-forge` when useful.
- `xtack-forge`: implement an authorized change.
- `xtack-trial`: design and run focused execution checks.
- `xtack-survey`: independently review requirements and the actual change or claim.
- `xtack-wake`: investigate prevention of a recurring or consequential failure, not a routine post-task step.

If a specialist or capability is unavailable, apply available methods without inventing an invocation and report any required assessment that remains unverified. Use host-native delegation when available. Before delegating or relying on a delegated or recovered assessment, read [delegation](references/delegation.md); respect boundaries and track actual host results. Separate reviewer or stakeholder contexts from the implementer and supply the original requirements, target, constraints and evidence. Never count a pending delegate as a response.

## Execute and verify

Investigate facts locally, identify the outcome and checks, and proceed autonomously within authorization. For implementation preserve supported behavior and user changes unless a change was authorized; split larger work into verifiable results and check their integration. Assess effort using impact, reversibility, uncertainty and affected users:

- **Light:** localized, low-impact and reversible; use relevant checks and focused self-review.
- **Standard:** ordinary implementation; require relevant execution checks and independent requirements and standards review.
- **Critical:** credible material harm, including data integrity, access control or payments; add checks and review for applicable risks such as recovery, concurrency and security.

Reassess on new evidence; small size alone does not justify downgrading risk. For Standard and Critical work, state the level and rationale, scope, constraints, criteria and evidence in the existing plan or report. Use checks appropriate to a non-implementation deliverable. Review and execution checks are separate; failed required checks or unavailable required review remain failed or unverified. Address blocking findings and recheck affected evidence after changes. Reuse valid checks where target and conditions remain unchanged. Report actual results, evidence and remaining gaps; do not claim that a receipt, snapshot or gate proves more than it observes.

For authorized implementation, consult [implementation guidance](references/implementation.md) for supported contracts, risk, verification and execution-core selection. When using the core or retaining independent reviews, consult [review and evidence](references/review-evidence.md). The core does not enforce host actions or authenticate claims. A bounded task may use the core without starting Voyage; find its installed `scripts/QUICKSTART.md` when needed. Do not require a separate database or record for ordinary work.

## Consequential decisions

An ADR-worthy decision has meaningful reversal cost or impact, materially different viable alternatives and rationale future maintainers need. Reuse an applicable ADR; routine choices need no council. For each new ADR-worthy decision, read [ADR decisions](references/adr.md), obtain independent positions from at least two distinct native subagents, compare their actual responses, decide as coordinator, and record an ADR before dependent implementation. If the positions or record are unavailable, leave the decision and dependent work blocked, continue independent work and report the gap. Follow project conventions and preserve explicit user choices.
