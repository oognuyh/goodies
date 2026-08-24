# Diagnostic Bundle Export

Read only after the user requests a bundle. If they requested only a bug report,
offer the scrubbed bundle once and wait for a bundle request.

1. Ask the redaction level and explain the choices: skeleton omits tool-result
   bodies; evidence includes bodies only for cited events; full includes all.
2. Follow `../assets/templates/bundle-README.md`. Read
   [redaction policy](redaction-policy.md), then dispatch
   [scrub](prompts/scrub.md) followed by [scrub audit](prompts/scrub-audit.md).
   Repeat both until the audit returns CLEAN.
3. Complete the template's evidence check and reconciliation. Show the final
   scrub log, file list, privacy outcome, and evidence outcome.
4. Archive only after the user approves that reviewed material. With the archive
   path, state its contents and point to the replacement log. Explain that
   scrubbing can miss information and every file needs review before sharing.
