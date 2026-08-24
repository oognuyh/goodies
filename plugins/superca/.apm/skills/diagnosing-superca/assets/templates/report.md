# Session diagnosis: <session-id>

Report path: <saved path when requested; otherwise "in chat">
Written: <ISO timestamp>

## 1. Problem statement (REQUIRED)

<Copied from the case notes or saved case file.>

## 2. Triage verdict (REQUIRED)

<What the evidence shows happened around the reported problem. Prose, with
`path:line` after every claim. State confidence: high / medium / low, and
what would raise it. Name a skill or runtime cause only when the evidence
supports that attribution.>

## 3. Environment (REQUIRED)

- OS:
- Harness and version:
- Models seen:
- Superca install root / version / git sha:
- Skill files read or injected (sha1 table from the case notes):
- Other plugins, extensions, MCP servers:
- Instruction files present (paths only):

Label every environment field and skill observation as historical evidence,
unverified snapshot, current observation, or unknown, and record its
supporting evidence location.

## 4. Sessions examined (REQUIRED)

| Role | Session id | Absolute path | Lines | Bytes |
|---|---|---|---|---|

Rejected candidates: <id — path — why>, or "none".

## 5. Timeline (REQUIRED)

One row per human-typed prompt. Events column lists skills invoked,
subagents dispatched, compaction, errors, resumes, aborts.

| Turn | Line | Time | Request (one line) | Events |
|---|---|---|---|---|

## 6. Findings (REQUIRED, for dimensions actually examined)

Each finding:
```
- finding: <one sentence>
  evidence: <path:line> — "<short quote>"
  turns: <first>–<last>
  confidence: high | medium | low
```
A checked dimension with nothing to report says
`none found — checked: <what was checked>`. Omit dimensions not examined and
list them in coverage notes.

### 6.1 Skill timeline
### 6.2 Plan adherence
### 6.3 Repeated work
### 6.4 Stumbles
### 6.5 Quality evidence
### 6.6 Request conflicts
### 6.7 Cost and time
### 6.8 Other plugins and skills used

## 7. Superca involvement (REQUIRED)

not indicated | possible | likely

Evidence lines: <path:line list>. State confirmed defect, suspected defect, or
unresolved gap; distinguish evidence from inference. When improvement is
requested, give the smallest supported fix.

## 8. Coverage notes (REQUIRED)

- Not read: <ranges, files, and why>
- Harness features unavailable: <list or none>
- Session was in progress at read time: yes/no
- For your human partner to double-check: <list or none>

## 9. Similar sessions (only when requested)

| Session id | Path | Date | Harness | Matched | Did not match |
|---|---|---|---|---|---|
