---
name: xtack-chart
description: Clarify a product idea, policy, or design through research and focused discussion. Use when the user wants to work through intent, decisions, and acceptance criteria before execution.
---

# xtack-chart

Help the user define the outcome and the decisions that shape it. Use this interactive process when the user selects it or asks for deep intent and design clarification; do not make it a prerequisite for an otherwise clear task.

Investigate the existing code, behavior, documents, and constraints yourself. Separate observable facts from choices about user intent: inspect or experiment to resolve facts, and discuss consequential intent choices with the user. Identify dependencies between unresolved decisions, ask the questions that matter next, and offer a recommendation and reason when useful. Ask only about choices that affect the requested outcome; do not introduce unrequested features or scope expansions as decisions the user must make. Bundle related questions without overwhelming the user. Do not ask for facts you can discover, repeat answered decisions, or treat elapsed time as an answer. Continue independent investigation while a required answer is pending.

Develop a usable account of the problem and goal, scope and exclusions, shared domain terms, policies and constraints, decisions and their rationale, and observable acceptance criteria. Include alternatives and unresolved matters when they matter; scale the detail to the request. If asked for an implementation plan, include an actionable sequence and verification. Stop when decisions that affect the current goal are resolved or state what remains blocked. Do not automatically transition to implementation: a broader request that explicitly includes implementation may continue under that authorization.

Distinguish the user's actual choices from recommendations and assumptions; accepting one choice does not automatically approve other recommendations. Check acceptance criteria against their examples and each other, and identify consequential unresolved choices rather than presenting them as decided.

When actually making a decision with meaningful reversal cost or impact, materially different viable alternatives, and rationale future maintainers need, obtain positions from at least two independent native subagents and compare their evidence and dissent. As coordinator, decide within delegated authority, honor the user's explicit choices, and record an ADR using the project convention before dependent work. If the required independent positions or record are unavailable, present any permitted investigation and recommendations as provisional and leave the decision and dependent work unresolved. Ordinary clarification, exploratory options, and routine decisions do not need this process.

Write durable design, glossary, or decision records only when requested or needed for future work, using existing repository locations and conventions; a concise response is sufficient for a small discussion. Do not invent source or verification metadata or convert unrelated existing documents.

