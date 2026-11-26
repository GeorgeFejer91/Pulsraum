# Project contract

## Purpose

Eine deutsch- und englischsprachige Projektseite fuer offene Biosensorik und selbstbestimmtes Biofeedback mit lokaler Datenverarbeitung.

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

- [x] Offer English and German in the main menu. The rendered suite checks both
  directions, saved preferences, section labels and links on desktop and phone.
- [x] Organize the site as Auf einen Blick, Grundlagen, Projektverlauf, and Team.
  The first two of five milestones are complete according to the project owner.
  The remaining milestones describe planned validation, local analysis, and
  home sleep measurement research.

Use the most recent successful [Pages workflow run](https://github.com/GeorgeFejer91/Pulsraum/actions/workflows/pages.yml) and the live visual review to verify publication.

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

Give each website section visibly distinct boxes, one per topic, milestone,
or person. Keep supporting text, images, and links with their subject.

- **Auf einen Blick** presents the project, example uses, local data processing,
  and two scrolling NeuroKit2 simulations in one box. The breathing trace
  sits above the ECG. The lungs expand and contract with the breathing trace,
  and the heart pulses as each R peak arrives at the right edge. Each row
  shows its source and simulated rate. Reduced-motion and JavaScript-free
  views show both organs and traces at rest.
  The ECG models a resting chest-strap signal at 130 Hz with variable beat
  spacing, breathing-related baseline drift and intermittent contact noise.
  Regenerate the checked-in paths with `python scripts/generate-signals.py`.
- **Grundlagen** introduces the hardware, software, and published research that
  Pulsraum builds on. Each box links to its associated paper or software.
- **Projektverlauf** presents the five milestones in an ordered list. Each card
  shows its number at the top left and its labeled progress checkbox at the
  top right. Completed milestones are checked and planned milestones are empty.
  Visitors can read these statuses in either language. Keep the
  distinction between completed prototypes and planned measurement validation.
  Each card illustrates its step with one inline SVG. Entering the viewport
  starts a continuous loop. One pause control covers all five illustrations.
  Reduced motion and JavaScript-free views show the complete still diagram.
  In the smartphone breathing diagram, the plotted breath samples drive the
  abdomen, phone, mouth airflow and graph cursor together. The cursor draws
  the blue rising trace as particles enter the mouth and the ochre falling
  trace as they leave. The phone waves use the active segment's color.
  The validation card links its editable spirometer scene in `assets/models/`.
  The phone compares three labeled streams on one time axis. Its own signal is
  solid blue. The Polar H10 above it uses ochre dashes and the spirometer to
  its right uses teal dots, with matching Bluetooth paths into the display.
  The Polar strap expands through the two-second inhale and contracts through
  the two-second exhale. Its sensor face stays rigid. Regenerate its frame
  strip with `python scripts/generate-belt.py`.
  The WebP atlas uses the Blender camera `Webansicht · Messkopf und Griff`,
  frames 1 to 95 at every other frame, in four rows of twelve 256 × 300 px
  tiles. Hide the Bluetooth/receiver collection for this export.
  The local-analysis card shows a measurement moving directly from the user's
  smartphone to their home PC. Both devices and the one-way arrow remain
  visible in the still diagram. The planned sync uses no cloud service. A
  seated person sees two example results on the monitor: heart rate from
  the ECG and breathing rate from the respiratory trace. The animation shows
  the traces before the values; the still diagram shows both.
- **Team** gives each member a separate profile box with available details
  confirmed for publication. George's card uses the portrait from his academic
  website and links to his website, Google Scholar, GitHub, LinkedIn, ORCID and X.
  His card identifies the Max Planck Institute for Human Development and the
  University of Konstanz as his research affiliations. Their SVG emblems show
  the Minerva and the square Konstanz signet directly on the profile background,
  with dark lines in light mode and light lines in dark mode.
  A link in the footer opens GitHub for participation.

Use consistent box boundaries and spacing in both themes. Let boxes grow with
their contents and stack them in reading order on narrow screens.

## Architecture and ownership

The site uses static HTML and CSS with locally served JavaScript. The build script copies the pinned Pretext browser modules and license. The ordered milestone cards use native document flow and Pretext measurement for enlarged text. The Pages workflow stages only public website files and requires rendered verification of that artifact before deployment.

Public copy describes planned measurement software, not an already validated medical device. Polar H10 is part of the core concept. Physiological processing in the planned applications stays on the receiving device. The page covers personal health, medical-reference comparison/validation, and creative/immersive biofeedback. Publish only the selected public project text; private grants, financial declarations, account data, unknown credentials and invented partner commitments do not belong here. George Fejer and Alex of Zen Specs are the proposed team; do not invent Alex's surname, degree or exact duties.

The visual direction uses warm light surfaces, deep green type, generous document flow and four anchor-linked sections. The dark theme uses subdued green-black surfaces. The theme follows the system until a visitor chooses a mode, and the browser retains that choice when storage is available. Use blue for respiration and red for ECG in both themes, with text labels on the two signal traces. Native controls, visible keyboard focus, wrapping text and a usable no-JavaScript fallback are required. German is the default and the JavaScript-free version. The menu switches the whole page between German and English and remembers the selection when browser storage is available. Keep both versions aligned and avoid em dashes in project copy.

## Current verified state

- The legacy Pages pipeline served commit `7b007bd` on 25 November 2026. The apex returned HTTP 200 and www returned a 301 to the apex. GitHub reported both domains eligible for HTTPS and no provisioned certificate. HTTPS enforcement was off.
- Locally staged content passed 12 rendered cases in Chromium and WebKit. Desktop, narrow and landscape phone, both themes, and enlarged-text screenshots were inspected. Physical phones and screen readers were outside the tested matrix.

Next action: verify the Pages workflow run for the published revision. Check certificate provisioning and enable HTTPS when available, then verify the live page and redirects.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
