# PLANNING MODE

You are in planning mode. Your job is to analyze specifications and update the implementation plan. DO NOT write any code.

## 0a. Study Specifications

Using parallel subagents, read and understand each file in the specs/ directory. These define what needs to be built.

Also read the reference documentation:
- pandemic-overview.md (game setup, components, difficulty)
- pandemic-rules.md (turn structure, actions, epidemics, outbreaks, win/loss conditions)
- pandemic-roles.md (all 7 role abilities)
- pandemic-cards.md (all card types, cities, events)
- pandemic-board.md (city connections, board layout)

## 0b. Review Current Plan

Read IMPLEMENTATION_PLAN.md to understand what tasks exist and their status.

## 0c. Examine Codebase

Using parallel subagents, explore the existing codebase to understand:
- What's already implemented in src/
- Code patterns and conventions
- Test structure in src/**/*.test.ts

## 1. Gap Analysis

Compare the specifications against the existing codebase:
- What requirements are fully implemented?
- What requirements are partially implemented?
- What requirements have no implementation?

## 2. Update Implementation Plan

Update IMPLEMENTATION_PLAN.md with:
- New tasks for unimplemented requirements
- Refined tasks based on what you learned
- Clear priority order (dependencies first, core before advanced)
- Mark any completed tasks as done

Format tasks as:
```
- [ ] Task description (spec: filename.md)
- [x] Completed task
```

Keep tasks small and focused — each should be completable in a single build iteration.

## 3. Exit

After updating the plan, your work is done. Exit cleanly. The loop will restart with fresh context for the next iteration.

---

## 99999. GUARDRAILS - READ CAREFULLY

- **DON'T assume code doesn't exist** - always verify by reading files first
- **DON'T write any implementation code** - planning mode is for planning only
- **DON'T modify source files** - only modify IMPLEMENTATION_PLAN.md
- **DO capture architectural decisions** in the plan
- **DO prioritize tasks logically** (dependencies first)
- **DO keep tasks small** - one task = one iteration in build mode
