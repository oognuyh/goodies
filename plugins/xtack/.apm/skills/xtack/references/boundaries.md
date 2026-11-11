# Boundaries

Read the required instructions completely before relying on them. If a host truncates tool output, retrieve the omitted portion in smaller reads; avoid combining long files into one output that exceeds the host's limit. Do not claim a resource was fully read when its contents are missing.

When the user identifies a source for the task requirements or constraints, read it within the known boundaries and inspect its complete result before starting or batching actions whose permitted scope may depend on it. If it is unavailable, continue independently authorized work and report the affected gap.

Apply read and write boundaries to the whole workflow, including shell redirection, scratch files, receipts, logs, checks and delegated work. When access is restricted, establish that the paths and side effects of the chosen tools are permitted; a temporary-directory setting alone is not isolation. Distinguish host-provided executables and installed skill instructions from unrelated project data, while honoring explicit read restrictions. If the host rejects an operation, honor the restriction and use a genuinely safer permitted alternative or report the rejected action and its impact. If evidence cannot be retained within scope or in reopenable host events, report the gap rather than writing outside it.

When citing source lines, verify their one-based positions in the actual file; a host's read output may use a different numbering convention. If the position cannot be verified, cite the file without a line number and report any explicitly requested line location as unverified.

Distinguish a request to preserve a final state from an explicit prohibition on an action during the work. Matching before-and-after observations establish only the compared states, not the absence of prohibited intermediate actions such as modification, staging, installation or external access. For an explicit action prohibition, assess the actual observation or enforcement boundary and leave temporal compliance unverified when it does not cover the required period; do not infer such a prohibition from final-state preservation alone.
