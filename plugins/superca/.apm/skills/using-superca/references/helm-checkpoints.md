# Helm Documentation Checkpoints

Read at the first verified implementation slice, later verified milestones,
or while reconciling a documentation-review finding. `maintaining-project-docs`
owns document selection, format, mutation, and independent review.

## Initial Document Set

For an existing project with verified code and an unassessed initial durable
document set, bootstrap in the current Run as independent ready work. A Gate on
new implementation does not defer this assessment.

For Greenfield work, bootstrap immediately after the first verified
implementation slice, including when that slice is the entire implementation.
A pending or blocked code review does not postpone independent documentation
work. Initial assessment covers every durable slot; a plan's shorter forecast
does not narrow it.

## Later Milestones And Findings

At later verified milestones, invoke the update path when durable facts changed;
otherwise record no impact in the current Task. This checkpoint does not replace
the final independent documentation review.

The root owns documentation edits. If a review finding arrives while workers
are live, record the repair as pending root-owned work, continue supervision,
and make the edit after the wave settles. Dispatch its independent reviewer,
not the repair itself. The documentation Task remains open through repairs until
its final diff has an Approved verdict; an unavailable reviewer leaves it blocked
with the exact reason. Code and documentation reviews satisfy separate gates.
