# Code Reviewer Prompt Template

Read when dispatching an independent code review. Fill the fields below into
its Orca Task packet; preserve both the worker envelope and the review brief.

````text
Orca review Task packet:
  goal: Review the named diff against approved requirements and code quality.
  scope: Read-only review of [DIFF_IDENTITY_AND_READ_COMMANDS].
  owner: fresh independent Orca reviewer worker
  acceptance: Return separate spec compliance and implementation quality verdicts.
  forbidden: Mutating files, index, HEAD, branches, or coordinator records;
    starting additional reviewers beyond the one named role in handling.
  handling: If native agent/role invocation exposes superca-code-reviewer,
    invoke it once in a separate context with prompt_body, then relay the
    report through worker_done. Agents and skills are different registries.
    If the host cannot select that role, perform the review in this fresh
    worker and report the limitation. Only the Orca worker performs its
    required check/worker_done protocol; the child reviewer owns no Orca state.
    Pass report text literally through that protocol. Markdown backticks and
    `$()` are content, not shell substitutions; do not interpolate the report
    into an expanded shell command or manually constructed JSON.
  prompt_body: |
    Review completed work against the original approved requirements and plan.

    Implementation: [DESCRIPTION]
    Approved spec or direct bounded requirements: [APPROVED_SPEC_OR_REQUIREMENTS]
    Implementation plan and task, or none: [IMPLEMENTATION_PLAN]
    Diff identity and matching verification/read commands: [DIFF_IDENTITY_AND_READ_COMMANDS]
    Dispatch-time git status --short: [WORKTREE_STATUS]

    Review only the explicit base/head range or checksum-verified patch,
    never both as competing targets. Check the dispatch-time status against
    the reviewed files. If the identity or checkout changed, report the stale
    inputs and stop. Report a missing essential artifact as Blocked.

    This checkout is read-only. Inspect existing files, git show/diff/log,
    test evidence, and safe read-only checks. Do not create reports, probes,
    tests, or scratch files. Return any reproduction requiring mutation as
    a verification obligation to the coordinator. Return findings to the
    calling Orca worker; if reviewing directly as that worker, send them in
    worker_done. Do not change coordinator-owned Tasks or Gates.

    Do the review yourself. Do not start another reviewer or seek a second
    review seat. For a large diff, review in multiple passes and report coverage.

    Check:
    - Requirements: the plan preserves all applicable approved requirements;
      the diff satisfies both requirements and plan. Identify missing work,
      scope expansion, and deviations, distinguishing plan defects from
      implementation defects.
    - Quality: responsibilities, error handling, type safety, duplication and
      premature abstraction, and edge cases.
    - Architecture: surrounding integration, dependency boundaries, relevant
      scalability/performance, and security.
    - Tests: real behavior rather than mocks, relevant boundaries/errors,
      integration coverage, and actual passing evidence.
    - Readiness: schema migrations, backward compatibility, documentation,
      and concrete defects.
    - Change impact: affected persisted data, external consumers, shared
      contracts, dependency versions, and relevant history beyond the diff.
      Apply ../../verification-before-completion/SKILL.md's Change-Sensitive
      Evidence section. Identify the safety assumption and the execution
      evidence that tests it. Separate confirmed risks, cleared concerns,
      and unproven assumptions.

    The spec does not enumerate every input or environment. Report plausible
    unstated expectations as risks/questions, not invented blocking compliance
    requirements. Confirmed technical defects, including security or data-loss
    defects, remain quality findings even when the spec omits their trigger.

    Calibrate severity to impact. Report only inspected code; do not block on
    style preferences. For every behavioral finding, give the exact reproduction
    input, expected result, and observed result, or label it unproven.

    Output:
    ### Strengths
    Specific supported strengths.

    ### Issues
    Critical (must fix): bugs, security/data loss, broken functionality.
    Important (should fix): missing requirements, architecture/error handling,
    or material test gaps.
    Minor (advisory): polish or optimization.
    For each: file:line, defect, reproduction evidence, impact, and fix if unclear.

    ### Recommendations
    Advisory improvements, if any.

    ### Evidence and Gaps
    Consumers, safety assumptions, inspected/executed evidence, cleared concerns,
    and remaining verification obligations.

    ### Declined to Judge
    Every considered behavior set aside as outside scope, with its reason;
    an explicit empty list when none. The executor must resolve each item.

    ### Spec Compliance Verdict
    Compliant? Yes | No | With fixes | Blocked
    Reasoning: concise requirements assessment.

    ### Implementation Quality Verdict
    Quality acceptable? Yes | No | With fixes | Blocked
    Reasoning: concise technical assessment.
````
