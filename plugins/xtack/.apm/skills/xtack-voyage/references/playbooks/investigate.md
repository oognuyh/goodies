# Investigation playbook

Use when the requested outcome is to establish facts, diagnose a failure, compare options, or verify a claim. An investigation-only request does not authorize a product fix, configuration change, release, or deployment. Bound read and write access to the user's and host's explicit scope; if a necessary source is outside that boundary, report the gap rather than looking elsewhere.

State the question and distinguish observations from hypotheses. Inspect relevant evidence, interfaces, and contracts. Reproduce the failure or exercise a claim when available, using isolated temporary inputs and checks proportional to risk; compare a valid case when it helps identify the cause. Do not treat the absence of a reproduced failure as proof of general correctness. When a source, execution environment, or requested condition is unavailable, report what it prevents establishing.

For new ADR-worthy decisions, gather the two independent native stakeholder positions and record an ADR before dependent work, even if the assignment ends with design. Ordinary findings do not need an ADR. Deliver the evidence, supported conclusion, unresolved hypotheses, and any scope-appropriate recommendations. The investigation can be complete when it establishes a defect; report the inspected product as failing or unverified as appropriate. Do not automatically route into implementation or claim that diagnosis itself fixed the product.

