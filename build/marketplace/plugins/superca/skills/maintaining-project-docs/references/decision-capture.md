# Decision Capture

Read in `decision` mode, or when reviewing an ADR/ADR-grade claim.

Use `decision` only after the calling root Supervisor has made a final
ADR-grade decision (with or without Council) or the human has resolved a
human-owned ADR-grade Orca Gate. Recover the final
decision, Objective, Orca Run and Tasks, alternatives, evidence, consequences,
dissent or unresolved risk, and any superseded ADR.

For an unresolved consequential choice, return to the caller for evidence
gathering or `decision-council` when competing interests qualify;
documentation capture does not make the decision.

Check the caller's recorded ADR-grade predicate assessment from
`decision-council` before capture. If it is absent or contradicts the evidence,
return that gap to the Supervisor for classification; this skill does not make
a replacement decision. Make no documentation diff for a routine choice, an
unresolved Gate, a meeting transcript instead of a final decision, or a
duplicate ADR. Record the reason in the current Orca Task result when useful.

Reuse the project's existing decision path and filename convention. If there
is no existing convention, write one ADR at
`docs/tracking/decisions/YYYY-MM-DD-<decision-slug>.md`.

Use this exact document shape, omitting only the `Supersedes` line when it is
inapplicable:

```markdown
# <Decision title>

**Status:** Accepted
**Date:** <YYYY-MM-DD>
**Objective:** <objective identifier or concise objective>
**Orca:** Run `<run-id>`; Tasks `<task-id list>`
**Supersedes:** `<relative ADR path>`

## Context and Decision Question

## Decision

## Alternatives Considered

## Evidence and Rationale

## Consequences and Verification Obligations

## Dissent and Unresolved Risk
```

`Accepted` records the Supervisor's or human's final decision, not the
documentation review verdict. Only the separate independent `Approved` review
of the final ADR diff satisfies the downstream execution gate; do not infer it
from the ADR status field.

Write concise decision evidence, not conversation history. Do not invent
stakeholder preferences, departments, rosters, dissent, or risk. If there is no
material dissent or unresolved risk, write:
`None identified from the reviewed evidence.`

When a new decision supersedes an earlier accepted ADR, write the new ADR and
update the earlier ADR only to mark its superseded status and link to the new
ADR. Preserve the earlier ADR history; do not rewrite its original rationale.

Request the independent documentation review before downstream implementation
relies on the ADR. If its findings change the ADR, request a focused review of
the final decision text. Only an Approved verdict on that text opens the
dependent implementation Task; a conditional verdict or Supervisor-only check
does not. Return the ADR review Task ID and verdict to the calling Supervisor
so it can enforce the dependency in the Orca Task graph.
