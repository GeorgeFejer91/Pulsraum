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
- [x] Publish four sections: project description, application domains, team, participation/contact.
- [x] Verify desktop/phone reflow at 320, 390, 844 and 1440 px, skip-link keyboard focus, team anchor, 21 measured text regions, four sections and no observed clipping. Full assistive-technology and 200% text-spacing matrices remain untested.
- [x] Verify GitHub Pages built commit f14dd760f84508c52eb8ced424b56e72a9621c70 successfully; default HTTPS Pages URL redirects to the configured custom domain.
- [ ] Verify rendered live page after apex DNS resolves.
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

- Public repository and four-section static site created on 25 November 2026. Bootstrap and context checker passed; npm build/syntax and four-section/local-asset checks passed.
- GitHub Pages built exact product commit f14dd760f84508c52eb8ced424b56e72a9621c70. Source: main, repository root. CNAME is pulsraum.eu. Local main and remote main matched at that commit when checked.
- Namecheap www CNAME saved to GeorgeFejer91.github.io; verified after refresh and through public resolver 1.1.1.1.
- The old default apex URL redirect is absent in the latest observed panel. Public lookup currently returns no apex A record. Root ALIAS/A configuration remains unfinished.
- Browser input from another activity interrupted the domain edit. A request to leave the Namecheap DNS tab available is pending; do not fight concurrent input or use stale window/element geometry.
- HTTPS certificate is not yet provisioned; enforce-HTTPS is false. Do not describe the custom domain as live or secure until observed. No SSL purchase is necessary for GitHub Pages.
- Native UI selection requires fresh state after window-size or user-input changes. Scope edits to this domain's website records; preserve mail, SPF, account and security settings.

Next action: when the domain tab is available, set apex ALIAS @ to GeorgeFejer91.github.io (or all four official GitHub A records), verify authoritative/public DNS, then verify live content and HTTPS availability. User authorized this DNS connection and public website launch. Record any remaining propagation condition explicitly. No further team member, company identity or medical capability was invented.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
