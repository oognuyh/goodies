# Plan Document Reviewer Prompt Template

Use this template when creating a read-only Orca review Task for a plan
document.

**Purpose:** Verify the plan is complete, matches the spec, and has proper task decomposition.

**Create after:** The complete plan is written.

```
Orca Task:
  purpose: "Review plan document"
  mode: read-only
  owned_files: []
  context:
    plan: [PLAN_FILE_PATH]
    spec: [SPEC_FILE_PATH]
    durable_doc_check: "Verify the plan carries affected durable docs from the spec or an explicit no-impact result."
  prompt: |
    You are a plan document reviewer. Verify this plan is complete and ready for implementation.

    Plan to review: [PLAN_FILE_PATH]
    Spec for reference: [SPEC_FILE_PATH]

    ## What to Check

    | Category | What to Look For |
    |----------|------------------|
    | Completeness | TODOs, placeholders, incomplete tasks, missing steps |
    | Spec Alignment | Plan covers spec requirements, no major scope creep |
    | Durable Docs | Plan carries affected durable files from the spec or an explicit no-impact result |
    | Task Decomposition | Tasks have clear boundaries, steps are actionable |
    | Buildability | Could an engineer follow this plan without getting stuck? |

    ## Calibration

    Only flag issues that would cause real problems during implementation.
    An implementer building the wrong thing or getting stuck is an issue.
    Minor wording, stylistic preferences, and nice-to-have suggestions are not.

    Approve unless there are serious gaps: missing requirements from the spec,
    contradictory steps, placeholder content, or tasks so vague they can't be acted on.

    ## Output Format

    ## Plan Review

    **Status:** Approved | Issues Found

    **Issues (if any):**
    - [Task X, Step Y]: [specific issue] - [why it matters for implementation]

    **Recommendations (advisory, do not block approval):**
    - [suggestions for improvement]
```

**Reviewer returns:** Status, Issues (if any), Recommendations
