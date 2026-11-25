# Project contract

## Purpose

Eine deutschsprachige Projektseite fuer offene Biosensorik und selbstbestimmtes Biofeedback mit lokaler Datenverarbeitung.

## Primary goal

Deliver the smallest usable result that satisfies the current user request and
can be verified at its real output surface.

## Goal and session continuity

Overall goal: publish a German one-page project website named Pulsraum on GitHub Pages and connect the user-owned domain pulsraum.eu. The user explicitly authorized launch and domain configuration on 25 November 2026.

Resume existing GSD `.planning/` state or the established project checklist.
Until an execution workflow owns the state, use this small active checklist:

- [x] Create the separate public repository GeorgeFejer91/Pulsraum and verify its control plane.
- [ ] Publish four sections: project description, application domains, team, participation/contact.
- [ ] Verify keyboard access, phone/desktop layout, readable text and local Pretext measurement.
- [ ] Verify the exact deployed GitHub Pages commit and live page.
- [ ] Connect pulsraum.eu and www through Namecheap DNS; verify HTTPS or name the exact pending external condition.

Replace these bootstrap tasks with the agreed product tasks. Before a session
ends, record the next concrete action, blockers, evidence, and last-observed
branch/commit/publication state in the canonical task owner. Keep one active
checklist and do not close the overall goal before its acceptance criteria pass.

## Non-goals

- No speculative framework, service, abstraction, compatibility layer, or
  deployment system.
- No second implementation tree or duplicate source of truth.
- No capability claim without matching evidence.

Add project-specific non-goals only after they prevent a plausible wrong turn.

## Product/control-plane boundary

- Product source and deliverables: outside `for-ai/`; exact roots are
  **Undecided until the first deliverable selects them**.
- Agent orchestration and durable project memory: `for-ai/`.
- Local generated diagnostics and scratch evidence: `.for-ai-local/` (ignored).

## Architecture and ownership

The site is static HTML/CSS with a small locally served JavaScript text-measurement module. Pretext is pinned; its browser files and license are copied locally by a standard-library build script. GitHub Pages serves the repository root. No application framework, server, analytics, forms, sensor permissions or health-data collection are needed for this project page.

Public copy describes planned measurement software, not an already validated medical device. Polar H10 is part of the core concept. Physiological processing in the planned applications stays on the receiving device. The page covers personal health, medical-reference comparison/validation, and creative/immersive biofeedback. Publish only the selected public project text; private grants, financial declarations, account data, unknown credentials and invented partner commitments do not belong here. George Fejer and Alex of Zen Specs are the proposed team; do not invent Alex's surname, degree or exact duties.

Visual direction: restrained warm background, deep green type, generous document flow and four anchor-linked sections. Native controls, visible keyboard focus, wrapping text and a usable no-JavaScript fallback are required. The site is German; no em dashes in its project copy.

## Current verified state

- Fresh Git repository initialized on 2026-11-25.
- AI control plane created and mechanically checked.
- No product implementation has been scaffolded.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
