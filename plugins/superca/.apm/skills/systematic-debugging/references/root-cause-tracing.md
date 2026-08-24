# Root Cause Tracing

Read when a failure appears deep in a stack or the originating caller is unknown.

Starting at the operation that fails, follow its actual arguments back through
callers until the invalid value or state was introduced. Record the value at
each boundary; fix its source rather than only suppressing the last symptom.

For example, a `git init` in a source directory may trace through:

```text
execFile(..., { cwd: projectDir }) receives ''
← workspace initialization received ''
← session creation read testContext.tempDir
← top-level test setup read tempDir before beforeEach initialized it
```

The first visible operation is not the originating defect. In this example,
rejecting premature access at test setup fixes the source; boundary validation
can also protect alternate callers.

If the caller is unclear, instrument immediately **before** the failing operation
with arguments, working directory, relevant non-secret environment, timestamp,
and a captured stack. In tests, write diagnostic output to stderr when the
project logger is suppressed. Capture the full relevant trace and identify its
calling file/line; remove temporary instrumentation after confirming the cause.

## Isolate Test Pollution

If a test creates an unwanted artifact and its identity is unknown, isolate tests
with the project's runner. For a Bash/npm project whose test command accepts a
file argument, the bundled helper runs tests one at a time. From the target
project root, use an artifact that does not already exist:

```bash
bash "<installed-skill-dir>/scripts/find-polluter.sh" 'packages/core/.git' 'src/**/*.test.ts'
```

For other runners, use their supported isolation command; npm/Bash is not a
lifecycle requirement. Once the source is established, apply
[defense-in-depth](defense-in-depth.md) at the relevant boundaries and verify the
original symptom. An incomplete trace remains an evidence gap.
