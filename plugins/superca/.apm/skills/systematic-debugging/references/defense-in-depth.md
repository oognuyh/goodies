# Defense-in-Depth Validation

Read after identifying an invalid-data root cause that can reach an operation
through multiple paths. Map the complete data flow and its checkpoints; entry
validation alone may be bypassed by internal callers, refactoring, or test doubles.

Apply the checks at each relevant layer:

| Layer | Purpose | Example for an invalid workspace path |
| --- | --- | --- |
| Entry | Reject invalid external input | Require a nonempty existing directory |
| Business operation | Enforce the operation's own preconditions | Reject an empty workspace path even for internal callers |
| Environment | Prevent context-specific damage | Refuse test initialization outside the owned temporary workspace |
| Diagnostics | Retain context when another check fails | Record path, cwd, and call stack before the operation |

Test the layers independently, including alternate paths that bypass entry
validation. Keep diagnostic values non-secret. Confirm the original regression
and affected consumers; several checks are not proof that every path is safe.
