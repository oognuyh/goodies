# Project document format

Use this reference when creating, updating, or reviewing durable project
documents. It defines each file's responsibility and minimum useful content,
not mandatory boilerplate headings. Preserve an existing project's useful
conventions. Create only files supported by durable, project-specific facts;
never create an empty file to fill a slot.

## Shared writing standard

- Keep each statement at the file's level of detail. Retain it when it changes
  future work and cannot be recovered cheaply and reliably from code or config.
  State observable rules and consequences, not generic advice or a narration
  of how these documents were produced.
- Ground current-behavior claims in verified implementation. Label intended
  but unimplemented scope as future in `docs/tracking/status.md`. A plan is not
  proof that a feature exists. In a pre-implementation ADR, name tests as
  verification obligations, not completed evidence.
- Keep each document usable on its own. A topic may appear at two levels only
  when each file states a different part: the domain rule belongs in
  `business-rules.md`; an enforcement boundary belongs in `standards.md`; a
  consumer's wire behavior belongs in `contracts.md`. Avoid copying the same
  paragraph or routing readers between `docs/` files to reconstruct one fact.
- Use the project's working language. Match established headings where they
  work; the content shapes below are semantic sections, not a scaffold to fill.
- Diagrams clarify a maintained claim; they do not replace its text, evidence,
  or failure behavior. Use only diagrams the project's actual Markdown viewers
  render, and keep the source readable when rendering is unavailable.

## Agent entry points

`AGENTS.md` is canonical. Give the next agent a short project overview, a
navigation map to the applicable documents and meaningful modules, the few
project-wide hard gates, targeted pre-work reads for risky areas, and concrete
conditions that must be escalated. Put detailed rules in their owning document
instead of duplicating them here. `CLAUDE.md` contains exactly `@AGENTS.md`
and a final newline.

Create a nested `AGENTS.md` only where a cohesive module has material rules
that differ from the root. State its ownership and non-ownership, verifiable
invariants, local implementation pattern, and relevant verification guidance.
Do not generate one per directory, vendored dependency, or test-only folder.

## Durable `docs/` slots

### `architecture.md` — system composition

Describe components and their responsibilities, dependency direction,
external boundaries, and one representative end-to-end flow. Name what crosses
each consequential boundary. A reader should be able to trace entry to result.
Keep domain behavior, security policy, coding rules, and debugging traps in
their own files. A bare technology list is not an architecture.
When three or more consequential components and two or more boundaries appear
in one end-to-end flow, use one supported Mermaid flowchart if it makes the
dependency and data path clearer than a table or numbered list. Keep the text
needed to understand behavior and failure without rendering; avoid repeating
the same mapping in both a diagram and a table. Record a no-diagram rationale
in the Orca Task result when this condition holds but the diagram adds nothing.
For an event-driven boundary, an Event Modeling diagram may clarify the
verified trigger, command, event, and read-model timeline. Use it only when
the target renderer supports its syntax; otherwise keep the same facts in text
or a simpler supported flow/sequence diagram. Do not model ordinary function
calls or an unimplemented event stream as durable events.

### `business-rules.md` — domain behavior

Define project terms, entity relationships, invariants, allowed and rejected
state transitions, calculations, and concrete edge-case outcomes. Each rule
should support a test without reading implementation details. Current limits
are not permanent prohibitions when the approved scope includes a later change.
Implementation mechanisms and access policy belong elsewhere.

### `user-journeys.md` — cross-step user outcomes (optional)

Create this file only when a recurring user goal crosses multiple meaningful
steps or roles and the ordering, handoff, or recovery path affects future
product work. Distinct roles may be played by one person in a local test; do
not collapse publisher and consumer merely because the demo has one operator.
For each journey, state the actor and goal, verified entry point,
ordered steps, consequential branch or failure, and observable outcome. A
Mermaid User Journey diagram may supplement that account when the viewer
renders it; its 1–5 score is illustrative, not measured satisfaction unless
backed by evidence. Keep domain invariants in `business-rules.md`, wire
details in `contracts.md`, and proposed journeys in the design spec until
implemented. A short single-step path needs no separate journey document.

### `security.md` — protection policy

Identify protected assets and trust boundaries. Where applicable, describe
authentication success and failure paths, authorization as subject/action/
condition plus explicit denials, audit events, credential lifetime and
rotation, and sensitive-data handling. Record only policy or a consequential
verified constraint; do not invent a desired policy from missing code.
Topology belongs in architecture; domain rules belong in business rules.

### `standards.md` — enforceable project rules

State only rules whose violation can be judged: dependency and module
boundaries, naming/structure conventions, configuration rules, and required
verification or integration gates. Give the violation criterion; explain a
surprising rule's reason. Put the substance of domain invariants in
`business-rules.md` and consumer status/error mappings in `contracts.md`.
A temporary task scope or a preference is not a permanent standard.

### `engineering-notes.md` — non-obvious practitioner knowledge

For a recurring trap, record **observed symptom → cause → response → check**.
For a non-obvious mechanism, explain why ordinary code inspection is
insufficient. A repeated-work checklist ends with a way to verify it worked.
Do not duplicate normative standards or narrate solved tickets.

### `operations.md` — runnable procedures

Write prerequisites and ordered commands for setup, run, build, verification,
data initialization, deployment, or recovery, only where applicable. Explain
configuration values by purpose and valid scope; identify steps whose order
matters. A person should be able to perform the procedure without guessing.
Verification commands must fail when their stated gate fails; a listing command
such as `gofmt -l .` needs an explicit empty-output assertion, and `;` must not
hide an earlier failure.
Code conventions and component topology belong elsewhere.

### `contracts.md` — consumer-facing interfaces

For each external API, CLI, library, event, or plugin interface, state access,
input, output, and error behavior. Put common wire conventions once at the
start. This is the source for consumer-visible status codes and error shapes;
it is not an implementation map or a duplicate of domain rules. A consumer
should be able to use the interface without inspecting source code.

### `tracking/status.md` — verified position and remaining scope

State what is built and what evidence verifies it, what remains in the
approved project scope, and current blockers. Distinguish built-but-untested
from verified. Keep future work explicitly future; a scope pause does not
become a permanent rule in `standards.md` or `business-rules.md`. Update this
file when the work changes durable project position, not to log every Task.
For each changed position, write one concise statement of capability or scope,
verification state, and recoverable evidence pointer. A correction to one gate
replaces its old bullet; its evidence investigation stays in the Orca Task,
not in `status.md`. Leave assertion-by-assertion test details there too.
For consequential review or ADR gates, cite a recoverable repository artifact
or Orca Run/Task record with its reviewed diff identity and final verdict.
Session-scoped `/tmp` files alone are not durable proof; if the named record
cannot be recovered, mark that gate unverified rather than claiming approval.

### `tracking/findings.md` — unresolved problems

For each unresolved item, state the triggering condition and observed symptom,
blast radius, why it cannot be resolved now, and a possible next check or
remedy. Investigate and fix in-scope problems first. Resolved knowledge that
will matter again belongs in `engineering-notes.md`, not an ever-growing
findings list.

### `tracking/decisions/` — consequential decisions

Only final choices meeting the three ADR-grade predicates in
`decision-council`'s Classify the Decision section become ADRs.
For filename, authority, exact record shape, supersession, and review, use the
[decision-capture](decision-capture.md) reference. An ordinary implementation
choice remains in its Task result or plan, not an ADR.

## Change and review rule

For a verified change, inspect the implementation diff against both the
existing documents and these slots: add newly durable facts, correct claims
made stale by the change, and leave unaffected content alone. When no slot has
new or stale durable content, make no documentation diff and record that result
in the Orca Task. Review each changed file for its content shape and exclusion
boundary, then cross-check both directions: supported facts missing from the
right file and current claims contradicted by the implementation.
