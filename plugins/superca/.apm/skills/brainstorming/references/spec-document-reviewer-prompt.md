# Spec Document Reviewer Prompt Template

Use this template when creating a read-only Orca review Task for a spec
document.

**Purpose:** Verify the spec is complete, consistent, and ready for implementation planning.

**Create after:** Spec document is written to docs/superca/specs/

```
Orca Task:
  purpose: "Review spec document"
  mode: read-only
  owned_files: []
  context:
    spec: [SPEC_FILE_PATH]
    durable_doc_check: "Verify the spec names affected durable docs or explains no impact."
  prompt: |
    You are a spec document reviewer. Verify this spec is complete and ready for planning.

    Spec to review: [SPEC_FILE_PATH]

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Completeness | TODOs, placeholders, "TBD", incomplete sections |
    | Consistency | Internal contradictions, conflicting requirements |
    | Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
    | Scope | Focused enough for a single plan, not covering multiple independent subsystems |
    | YAGNI | Unrequested features, over-engineering |
    | Durable Docs | Affected durable docs are named, or no-impact is explicit |

    ## Calibration

    Only flag issues that would cause real problems during implementation planning.
    A missing section, a contradiction, or a requirement so ambiguous it could be
    interpreted two different ways are issues. Minor wording improvements,
    stylistic preferences, and sections less detailed than others are not.

    Approve unless there are serious gaps that would lead to a flawed plan.

    ## Output Format

    ## Spec Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Section X]: [specific issue] - [why it matters for planning]

    **Recommendations (advisory, do not block approval):**
    - [suggestions for improvement]
```

**Reviewer returns:** Status, Issues (if any), Recommendations
