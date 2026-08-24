---
name: decision-council
description: Use when a consequential decision has materially different alternatives and competing stakeholder interests, or when explicitly asked to convene a decision council.
---

# Decision Council

The calling root session is the Supervisor and retains delegated decision
authority; stakeholder workers advise. Direct invocation covers this decision,
its evidence, and documentation, not the wider lifecycle. Return control to the
caller without activating Helm.

## Classify the Decision

Classify from the request and repository before creating worker Tasks. Explicit
invocation does not justify a Council or ADR for a routine choice.

**Human-owned:** destructive/irreversible actions; credentials or external
production mutation; publication/integration; product or policy intent absent
from evidence; legal/security risk acceptance; conflicting authorities or
requirements; material scope expansion; or an explicitly non-delegable Gate.
After bounded evidence gathering, a fact only the human can supply remains
human-owned. After Council, an unresolved high-impact tie is human-owned when
materially different options remain comparably supported and the Objective,
evidence, and reversibility cannot break it. Stakeholder agreement grants no
human authority; disagreement alone does not require a Gate.

**ADR-grade** meets all three predicates: meaningful reversal cost, context that
would be surprising without a record, and real alternatives with materially
different consequences. Record the predicate assessment in the design or Task
result. Every final ADR-grade choice needs an ADR, with or without Council.

**Council** additionally requires at least two distinct, evidence-backed
stakeholder interests. Derive them from the Objective and affected contracts,
not headcount: one operator may represent publisher, consumer, maintenance, or
security interests with different consequences. Without this predicate, the
Supervisor decides and captures the ADR without Council.

**Routine:** the Supervisor decides from the Objective, evidence, and conventions.
Return the decision/reason in the Task result when useful; no ADR or Council.

## Establish the Work and Packet

Before Council/ADR mutation, follow the
[Orca contract](../using-superca/references/orca-cli.md). Recover the bound Run,
existing decision Tasks/results, ADR, and review verdict before creating work.
Create a Run if absent. Use the smallest dependency-valid graph, defaulting
stakeholder Tasks to `light` unless evidence requires more.

Read the relevant instructions, durable docs, decisions, owners, tests, code,
and history. Select two to four non-redundant stakeholder interests; use three
when three material interests exist. Merge roles citing the same evidence and
consequences; do not invent personas, departments, or a stakeholder seat for the
Supervisor.

Give all roles the same Objective/stop condition, decision question, options,
evidence, constraints/acceptance, authority boundary, and facts not to invent.
Add only the represented interest. Require recommendation, evidence, rejected
alternatives, risks/consequences, agreement/dissent, confidence, and any
human-authority concern.

## Gather Positions and Decide

Round 1 is independent: roles do not see one another's recommendations. For
material disagreement, send disputed claims and evidence only to affected roles
for one rebuttal/revision round. Undisputed positions remain final. There is no
third round, open chat, vote rule, or permanent moderator.

The Supervisor weighs Objective fit, authority, evidence, reversibility, blast
radius, and verification cost. Consensus is evidence, not authority. For a
human-owned choice, open one scoped Gate naming the blocked Task and exact
question; only the human resolves it. Continue independent authorized work.

## Capture and Return

After the final delegated decision or resolved human Gate, invoke
`maintaining-project-docs` decision capture in the same Run. That skill owns ADR
shape, path, supersession, and independent review. Before dependent work relies
on the decision, require `Approved` on the final ADR diff and the Supervisor's
recorded acceptance Task. Otherwise report the exact pending review, Gate, or
evidence gap. Record the outcome rather than a meeting transcript.

On recovery, reuse completed positions, the ADR, and its verdict; do not create a
second Council or duplicate ADR for the same question. A failed role may be
replaced once. Fewer than two independent final positions returns to evidence
gathering; create a human Gate only for a fact/choice within human authority.
Unknown evidence stays unknown. Follow the Orca contract for silent workers and
unknown mutation results.
