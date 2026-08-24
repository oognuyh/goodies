# Architectural Design

Read only for the architectural path after classification.

1. Inspect code, durable documents, and relevant history. Follow established
   patterns and include only refactoring that serves the requested goal.
2. Clarify purpose, constraints, and success criteria one question at a time;
   prefer concise choices where useful. If independent subsystems need separate
   plans, establish their boundaries and order, then design the first sub-project.
3. Present 2–3 approaches with tradeoffs and a recommendation. Omit unrequested
   features. Define component responsibilities, interfaces, dependencies, data
   flow, error behavior, and tests. Keep each unit understandable and independently
   testable; unclear consumer boundaries need design work.
4. Present sections in proportion to their complexity and obtain applicable
   authority approval for each. Revisit unresolved understanding before proceeding.
5. Before writing or committing the spec, follow the
   [Orca contract](../../using-superca/references/orca-cli.md): confirm readiness,
   recover/create the Run and one root-owned design Task. Save the spec to
   `docs/superca/specs/YYYY-MM-DD-<topic>-design.md` unless the user supplied another
   location, and commit it. If Orca is unavailable, return an in-chat draft and
   leave the stage incomplete.
6. Include a durable-documentation impact section naming likely affected files,
   or an explicit no-impact forecast. Self-review the written spec for incomplete
   placeholders, contradictions, ambiguous requirements, and scope too broad for
   one implementation plan. Fix issues inline.
7. For a potentially ADR-grade or human-owned choice, invoke `decision-council`.
   When ADR-grade, capture the independently reviewed ADR and any qualifying
   Council before spec approval, planning, or dependent implementation. Represent
   this prerequisite in the Orca Task graph; a close-out docs Task cannot defer
   it. A human-owned choice creates one scoped Gate resolved only by the human.
8. Obtain approval of the **written spec**, not merely the earlier conversation.
   Without Helm, link the committed spec, ask the human to review it, and wait;
   requested revisions return through self-review and authority approval. With
   Helm, the Supervisor approves routine delegated specs and continues.
9. After the written spec and its prerequisites are approved, invoke
   `writing-plans`. Do not invoke an implementation skill at this handoff.

If an independent spec review is explicitly required by the caller, use
[spec-document-reviewer-prompt](spec-document-reviewer-prompt.md). It does not
replace this path's authority approval or add a default review seat.
