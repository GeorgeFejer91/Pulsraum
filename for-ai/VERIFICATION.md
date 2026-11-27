# Verification and readiness gates

Evidence must match the claim. Missing dependencies, credentials, hardware, or
runtime access produce `BLOCKED` or `NOT RUN`, never `VERIFIED`.

## Result vocabulary

- `VERIFIED`: the named check directly observed the claimed surface and passed.
- `PARTIAL`: some required evidence passed and the missing scope is named.
- `BLOCKED`: a concrete external or authority blocker prevented the check.
- `NOT RUN`: the check was intentionally not applicable or not attempted, with
  the reason stated.

## Gate 0: bootstrap readiness

From the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File for-ai/scripts/check-context.ps1 -ProjectRoot . -RequireRemote
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Pass when the context checker succeeds, the intended tree is clean, and local
`HEAD` equals `origin/main`.

## Gate 1: task contract

Before implementation, name:

- the observable user outcome;
- affected product surface and owner;
- acceptance criteria;
- focused check that can fail for the requested behavior;
- broader checks required by affected boundaries;
- explicitly deferred work.

## Gate 2: rendered verification after every repository change

Every agent must build and visually verify the full website after every
repository change and before committing or publishing it. This applies to
documentation, `for-ai/`, workflow, and tooling changes as well as to website
source and assets. Run `npm ci --ignore-scripts`, `npm run build`,
`npm run check`, and `npm run check:visual`. Install the locked browsers if
needed with `npx playwright install chromium webkit`.

Open the actual screenshots in `.for-ai-local/visual/` and review all four
sections at desktop and phone sizes in light and dark themes. Check each
[website layout rule](./PROJECT.md#website-layout) and the UI contract under
[architecture and ownership](./PROJECT.md#architecture-and-ownership). Check
the circular cloud on desktop and phone. Open each node’s details, switch
between signals, open both at the hub, and check dismissal and focus.
Verify the rotating nodes, upright labels and reduced-motion states. Confirm
the wheel advances after 15 seconds, follows the selected topic after a click,
and preserves focus and scroll during autoplay. Review the title at rest,
midway through the morph and in its compact position. Check that both
languages omit the animation pause checkboxes. Verify that each box in
the remaining sections has a single subject and a title, each team member has a separate
profile with the confirmed details available for publication, and the boxes
have visible boundaries and stack in reading order on narrow screens. Review
type, wrapping, spacing, signal labels and colors, link and button labels,
keyboard focus, and the visibility of all milestone descriptions and statuses.
Check navigation and theme switching by keyboard and verify the mobile menu
with touch.

Compare rendered outer insets and peer gaps in foundation and team cards,
including the shorter card in a stretched row. Check both axes of each timeline
cell, and measure the affiliation artwork against the card edges in single-row
and stacked layouts. Check both languages and themes. Allow for pixel rounding
and measure from margin boxes when the visitor increases text spacing.

Include 320 CSS px reflow, portrait and landscape, doubled text, text spacing,
and JavaScript disabled. The page must load its assets locally. Record the configurations
and screenshots reviewed, the observed outcome for each rule, and any
untested hardware or assistive technology. Automated test output complements
inspection of the renderings.

## Gate 3: integrated readiness

Run proportionate build, test, lint, type, runtime, visual, device, security,
and compatibility checks for every affected boundary. Gate 2 applies in full
for every repository change.

## Gate 4: publication and live visual verification

1. Review status and diff. Stage the intended changes and preserve unrelated
   local work.
2. Complete Gate 2 for the revision being published. A failed rule or missing
   visual evidence blocks publication until it is resolved.
3. Commit and push the completed change to the permitted publication branch.
   The Pages workflow runs on every main push and deploys its staged public
   artifact only after Chromium and WebKit pass. It stores the screenshots
   in the `website-screenshots` artifact.
4. Wait for the GitHub Pages deployment of the exact pushed SHA. Confirm the
   live HTTPS page and assets match that revision and the www address redirects
   to the apex. Check DNS and certificate status when changing domain setup.
5. Run the same browser suite against the live page, saving its evidence
   separately from the local review. From a fresh PowerShell session at the
   repository root, run:

   ```powershell
   $env:PULSRAUM_VISUAL_URL = 'https://pulsraum.eu/'
   $env:PULSRAUM_VISUAL_DIR = '.for-ai-local/visual-live'
   npm run check:visual
   ```

   Review the live screenshots against every UI and layout rule in Gate 2.
   Record the deployed SHA, Actions run, tested viewports and themes, screenshots
   reviewed, and any limitations. Publication is complete when the live review
   passes. If a check fails, diagnose it and verify the corrected release.

## Handoff evidence

Report exact commands or observed surfaces, results, untested scope, commit SHA,
remote synchronization, CI/deployment state, and whether `for-ai/` changed.
