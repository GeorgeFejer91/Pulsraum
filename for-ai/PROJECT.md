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
- [x] Verify the stretch accordion in desktop and smartphone browser renderings, including 320 to 1440 CSS px, touch, keyboard, dark mode, enlarged text, text spacing and JavaScript disabled.
- [x] Connect pulsraum.eu and www through Namecheap DNS. GitHub's health check validates both names, and live HTTP serves the page and www redirect.
- [ ] Verify the GitHub Actions deployment of the visually checked artifact.
- [ ] Verify the rendered site and www redirect over HTTPS with enforcement enabled.

Replace these bootstrap tasks with the agreed product tasks. Before a session
ends, record the next concrete action, blockers, evidence, and last-observed
branch/commit/publication state in the canonical task owner. Keep one active
checklist and do not close the overall goal before its acceptance criteria pass.

Current website update:

- [x] Add the scientific building blocks under Project. The local `main` update
  passed 12 Chromium and WebKit rendering cases and focused desktop and phone
  checks in both themes. Physical devices and screen readers were outside the
  test matrix.
- [ ] Publish the update when requested. The observed remote `main` points to
  the pinned-navigation update `f1a6ab78598e37463865f2a759b931ffe76d31dd`.

## Non-goals

- No speculative framework, service, abstraction, compatibility layer, or
  deployment system.
- No second implementation tree or duplicate source of truth.
- No capability claim without matching evidence.

Add project-specific non-goals only after they prevent a plausible wrong turn.

## Product/control-plane boundary

- Product source: root HTML, CSS, JavaScript, and `assets/`.
- Agent orchestration and durable project memory: `for-ai/`.
- Local generated diagnostics and scratch evidence: `.for-ai-local/` (ignored).

## Website layout

Give every website section visibly distinct boxes, one per topic, person, or
way to participate. Use a clear title and keep the explanation, images, and
links that support that subject together in its box. Keep section headings and
brief introductions above the boxes so readers can see how they fit together.

- **Project** groups each core idea in its own box, such as what Pulsraum does
  and how it processes data locally. Its **Wissenschaftliche Bausteine**
  subsection gives each planned technology a separate box and keeps its
  research or prototype link with it.
- **Applications** gives each use case its own box. The native accordion may
  provide the boxes, with one labeled disclosure per use case.
- **Team** gives each member a profile box with their name, a portrait cleared
  for publication, verified credentials, relevant website links, and a short
  description of what they do on Pulsraum. Omit individual details until they
  are confirmed and available for publication.
- **Participation and contact** gives each distinct opportunity or contact
  route its own box. Keep each call to action with the opportunity it serves.

Use consistent box boundaries and spacing in both themes. Let boxes grow with
their contents and stack them in reading order on narrow screens.

## Architecture and ownership

The site uses static HTML and CSS with locally served JavaScript. The build script copies the pinned Pretext browser modules and license. The applications section uses a native stretch accordion with Pretext measurement and document reflow for enlarged text. The Pages workflow stages only public website files and requires rendered verification of that artifact before deployment.

Public copy describes planned measurement software, not an already validated medical device. Polar H10 is part of the core concept. Physiological processing in the planned applications stays on the receiving device. The page covers personal health, medical-reference comparison/validation, and creative/immersive biofeedback. Publish only the selected public project text; private grants, financial declarations, account data, unknown credentials and invented partner commitments do not belong here. George Fejer and Alex of Zen Specs are the proposed team; do not invent Alex's surname, degree or exact duties.

The visual direction uses warm light surfaces, deep green type, generous document flow and four anchor-linked sections. The dark theme uses subdued green-black surfaces. The theme follows the system until a visitor chooses a mode, and the browser retains that choice when storage is available. Use blue for respiration and red for ECG in both themes, with text labels on the two signal traces. Native controls, visible keyboard focus, wrapping text and a usable no-JavaScript fallback are required. The site is German; no em dashes in its project copy.

## Current verified state

- The legacy Pages pipeline served commit `7b007bd` on 25 November 2026. The apex returned HTTP 200 and www returned a 301 to the apex. GitHub reported both domains eligible for HTTPS and no provisioned certificate. HTTPS enforcement was off.
- Locally staged content passed 12 rendered cases in Chromium and WebKit. Desktop, narrow and landscape phone, both themes, and enlarged-text screenshots were inspected. Physical phones and screen readers were outside the tested matrix.

Next action: verify the Pages workflow run for the published revision. Check certificate provisioning and enable HTTPS when available, then verify the live page and redirects.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
