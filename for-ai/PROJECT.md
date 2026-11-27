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
- [x] Verify the GitHub Actions deployment of the visually checked artifact.
- [x] Verify the rendered site and www redirect over HTTPS with enforcement enabled.

Replace these bootstrap tasks with the agreed product tasks. Before a session
ends, record the next concrete action, blockers, evidence, and last-observed
branch/commit/publication state in the canonical task owner. Keep one active
checklist and do not close the overall goal before its acceptance criteria pass.

Current website update:

- [x] Center the matching theme and language switches below the menu links.
  The sun and moon select light and dark. DE and EN select the page language.
  The rendered suite checks placement, selected states, labels, keyboard and
  touch operation, reflow, and persistence across reloads.
- [x] Organize the site as Auf einen Blick, Grundlagen, Projektverlauf, and Team.
  The first two of five milestones are complete according to the project owner.
  The remaining milestones describe planned validation, local analysis, and
  home sleep measurement research.
- [x] Align the four team profiles in a two-by-two grid with matching circular
  portraits and an initials placeholder for Daniel. Local Chromium and WebKit
  checks measured the golden-ratio portrait and spacing proportions and
  verified the narrow single-column layout in both languages and themes.
- [x] Show the responsible team members below each overview topic and the hub.
  The rendered suite checks the visible assignments, bilingual descriptions,
  and portrait-and-text layout, including enlarged text and text spacing.

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

Keep supporting text, images, and links with their subject. Use connected
nodes in the overview and separate boxes for foundations, milestones and people.

- **Auf einen Blick** connects five illustrated concepts to the planned open
  software suite on both desktop and phone. Open source, breathing, local data,
  ECG and creative biofeedback sit inside one dashed circle. Choosing a node
  turns the cloud toward its inline explanation while the labels stay upright.
  The visible overview advances through the five spokes every 15 seconds
  and starts a fresh countdown after a manual selection. It preserves keyboard
  focus and scroll position, and honors reduced motion. On desktop, the title
  moves and scales into place as the explanation appears.
  Each topic ends with two-sentence profiles beside circular portraits.
  Daniel appears for open-source development and local data. George and
  Alexandros cover the science and signal processing, joined by Alex for
  hardware ergonomics on the breathing and ECG topics and by Daniel for
  creative biofeedback. The hub shows all four. The site reuses the Team
  portraits and Daniel’s initials badge.
  The heart and lungs animate inside their nodes. Each reveals its own trace.
  The hub shows both stacked traces. The close control or Escape
  returns focus to the selected node. With enlarged text, a labeled picker
  complements the pictograms. Native fragment links reveal the same topics
  when JavaScript is disabled.
  The SVG symbols in `assets/illustrations/overview-icons.svg` were traced from
  `artwork/overview-pictograms.png`. The whole map expands and contracts in
  time with the breathing trace, while all five nodes and the central suite
  float at individual horizontal and vertical speeds. Pretext measures the
  labels on layout and language changes to reserve room for their travel.
  Every spoke follows the geometric centers of its node and the hub as they
  float. The ECG plot and spoke share the same NeuroKit2
  samples and playback clock. A canvas sized to the spoke draws the signal
  from the ECG node toward the suite along the moving spoke.
  The breathing trace sits above the ECG. The lungs expand and contract with it,
  and the heart pulses as each R peak arrives at the right edge. Each row
  shows its source and simulated rate. Reduced-motion and JavaScript-free
  views show the map, organs and traces at rest.
  The ECG models a resting chest-strap signal at 130 Hz with variable beat
  spacing, breathing-related baseline drift and intermittent contact noise.
  Regenerate the checked-in paths with `python scripts/generate-signals.py`.
- **Grundlagen** introduces the hardware, software, and published research that
  Pulsraum builds on. Each box links to its associated paper or software.
- **Projektverlauf** presents the five milestones in an ordered list. Each card
  shows its number at the top left and its labeled progress checkbox at the
  top right. At the default text size, the checkbox is at least 44 CSS pixels
  square. Completed milestones are checked and planned milestones are empty.
  A centered “Phase” label sits between adjacent cards in both languages.
  Visitors can read these statuses in either language. Keep the
  distinction between completed prototypes and planned measurement validation.
  Each card illustrates its step with one inline SVG. Entering the viewport
  starts a continuous loop when the visitor allows motion.
  Reduced motion and JavaScript-free views show the complete still diagram.
  In the Bluetooth ECG card the Polar H10 strap widens and its pod moves
  forward over two seconds, then returns over two seconds. The pod tint
  follows this breath and the lettering pulses with the ECG trace.
  In the smartphone breathing diagram, the plotted breath samples drive the
  abdomen, phone, mouth airflow and graph cursor together. The cursor draws
  the blue rising trace as particles enter the mouth and the ochre falling
  trace as they leave. The phone waves use the active segment's color.
  The validation card illustrates the planned recording session. Both phone
  screens identify the three traces by device name alone.
  The card places a translucent breathing adult with both sensors
  on the left and an enlarged view of the same phone on the right.
  The editable scene in `assets/models/polar-h10-worn.blend` contains the
  worn underbust band, rigid H10 pod and upright Vernier spirometer. The
  adult has closed eyes and a lip seal on the mouthpiece. The other hand
  holds the phone against the upper abdomen and follows its breathing travel.
  Its 108 frames at 24 fps show a breath through external motion. Chest
  excursion and elbow movement are amplified for the inline figure. Both
  arms articulate at the shoulder and elbow while preserving their grips.
  During the 1.75 s inhalation the breastbone moves forward and up, the
  shoulders lift slightly and the lower ribs widen a little. The Blender
  scene notes cite the motion-capture studies used for this illustration.
  Blue tracers fade with distance beyond the lips into both sides of the chest
  and regain opacity along the same path during expiration. One translucent
  material covers the whole avatar. A blue arrow points away from the abdomen.
  Expiration reverses the motion, with amber tracers and an amber arrow
  pointing back toward the abdomen. The inline figure uses 54 poses from this render,
  arranged in six rows of nine in `breathing-validation.webp`. One clock
  advances the atlas and the phone traces. The traces
  illustrate displacement, filtered chest acceleration and spirometer flow.
  Flow is negative during inspiration and positive during expiration.
  The card links to the film. The editable Blender source lives in the repository.
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
  University of Konstanz as his research affiliations. Each transparent SVG
  includes the institution's emblem and lettering. Use the German or English
  institute wordmark with the page language and the university's German mark
  in both languages. Keep the marks legible against the profile in both themes.
  Alex Cuthbertson’s card uses his supplied portrait and links to Zen Specs.
  Dr. Alexandros Kastrinogiannis’s card includes his portrait, project role in
  psychophysiology and immersive research, Leipzig Max Planck affiliation,
  selected publications, and links to LinkedIn, ORCID and a Google Scholar
  publication search. Daniel Artamendi’s card uses a circular initials
  placeholder and includes his biography, professional links and three
  selected projects in both languages. The four profiles form two equal-width
  columns above 680 CSS px and stack in reading order at narrower sizes.
  Cards share the same height within each row. Portraits and names align at
  the top. The card inset is 1.618 times the grid gap, and each portrait takes
  up 38.2% of the card’s inner width.
  A link in the footer opens GitHub for participation.

Apply the [accordion stretch geometry](skills/uncodixfy-pretext/references/accordion-stretch.md)
to content boxes. Center content groups on both axes within their boxes.
In stretched cards, share extra height equally above, between and below peer
groups. Anchor team profile contents at the top to align each row's portraits.
For the affiliation row, equalize the visible gaps from the card edges
and between the two full logos. Center each logo on its own row when they wrap.
Center milestone copy and art within their cells below the corner markers.
Menu bars use edge anchors. On desktop, start the sidebar at the top and align
the brand and link text to the leading side. On phones, anchor the brand to the
leading edge of the header and pin navigation to the bottom. The narrow grid
centers link labels within their cells. Center the switch pair horizontally
below the links at all viewport sizes.
Let boxes grow with their contents and preserve reading order on narrow screens.
When the main column has room, place the overview map beside the introduction
or selected detail, lay out the three foundation cards in one row, and pair
milestone text with its illustration. On short landscape screens, use the
measured bottom menu height to size the map and let open details grow in the
page flow.

## Architecture and ownership

The site uses static HTML and CSS with locally served JavaScript. The build script copies the pinned Pretext browser modules and license. The ordered milestone cards use native document flow and Pretext measurement for enlarged text. The Pages workflow stages only public website files and requires rendered verification of that artifact before deployment.

Public copy describes planned measurement software, not an already validated medical device. Polar H10 is part of the core concept. Physiological processing in the planned applications stays on the receiving device. The page covers personal health, medical-reference comparison/validation, and creative/immersive biofeedback. Publish only the selected public project text; private grants, financial declarations, account data, unknown credentials and invented partner commitments do not belong here.

The visual direction uses warm light surfaces, deep green type, compact document flow and four anchor-linked sections. The dark theme uses subdued green-black surfaces. The theme follows the system until a visitor chooses a mode, and the browser retains that choice when storage is available. Use blue for respiration and red for ECG in both themes, with text labels on the two signal traces. Native controls, visible keyboard focus, wrapping text and a usable no-JavaScript fallback are required. German is the default and the JavaScript-free version. The menu switches the whole page between German and English and remembers the selection when browser storage is available. Keep both versions aligned and avoid em dashes in project copy.

The main navigation stays visible as a left sidebar on wide screens with a mouse or trackpad and as a bottom menu on phones and narrow screens. Native anchor links scroll smoothly when the visitor allows motion. The bottom menu leaves room to reach the footer and its links. This layout shipped in `f1a6ab7` and passed the live Brave, Chromium, and WebKit checks. [Pages deployment](https://github.com/GeorgeFejer91/Pulsraum/actions/runs/45833362433)

## Current verified state

- Public repository and four-section static site created on 25 November 2026. Bootstrap and context checker passed; npm build/syntax and four-section/local-asset checks passed.
- GitHub Pages built and deployed 7b007bd1471018d5ba12422196c01028dce0d131 from the root of main. The public HTTP page served matching HTML, CSS and theme JavaScript. Chromium verified both themes at 320, 390, 844 and 1440 px, including 28 measured text regions, keyboard focus, theme persistence, signal contrast, and text spacing.
- Locally staged accordion content passed 12 rendered cases in Chromium and WebKit. Desktop, narrow and landscape phone, both themes, and enlarged-text screenshots were inspected. Physical phones and screen readers were outside the tested matrix.
- Main and origin/main matched at `f39ef3123c6a07c705637b90845201bc9c48b0f2`. The [Pages workflow](https://github.com/GeorgeFejer91/Pulsraum/actions/runs/45687232807) passed the rendered checks, retained 24 screenshots, and deployed that commit successfully. The live HTTP site passed the same 12 browser cases. Its desktop Chromium and phone WebKit renderings were inspected.
- Both Namecheap authoritative nameservers and public resolvers 1.1.1.1 and 8.8.8.8 returned all four GitHub Pages IPv4 addresses for pulsraum.eu and the www CNAME to GeorgeFejer91.github.io. Requests using those DNS answers returned the German four-section page at the apex (HTTP 200) and a www redirect to it (HTTP 301).
- On 26 November 2026, Brave reproduced a certificate hostname error for both public names. DNS and CAA checks passed. Removing and immediately restoring the same custom-domain binding restarted GitHub Pages certificate provisioning. GitHub approved a certificate for `pulsraum.eu` and `www.pulsraum.eu` and accepted HTTPS enforcement.
- All four HTTP and HTTPS entry URLs ended at `https://pulsraum.eu/` after the edge cache refreshed. The HTML, CSS, and two entry scripts matched deployed commit `f39ef3123c6a07c705637b90845201bc9c48b0f2`. On Windows, Brave, Chrome, Edge, Playwright Firefox, and Playwright WebKit passed entry URL, main navigation, and accordion checks at desktop and phone viewport sizes. The existing live Chromium and WebKit visual suite passed all 12 cases. Physical phones and the Safari application were outside the test matrix.
- Native UI selection requires fresh state after window-size or user-input changes. Scope edits to this domain's website records; preserve mail, SPF, account and security settings.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
