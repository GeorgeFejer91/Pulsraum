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

## Gate 2: focused change

Every website change requires rendered visual verification before commit and
publication, including copy, CSS, scripts, markup, and assets. Run
`npm ci --ignore-scripts`, `npm run build`, `npm run check`, and
`npm run check:visual`. Install the locked browsers when needed with
`npx playwright install chromium webkit`.

Open the desktop and phone screenshots in `.for-ai-local/visual/` and inspect
the affected area in light and dark themes where relevant. Check the rendered
layout, labels, wrapping, spacing, focus and expanded states. Keep the four
main sections readable at 320 CSS px and without JavaScript. The accordion must
expand without internal scrolling and preserve touch and keyboard access.
The browser check also covers landscape, 480 CSS px, doubled text, text
spacing, and local asset loading. Record the renderings reviewed, checks run,
and untested device or assistive-technology scope.

For launch, verify the exact GitHub Pages build SHA, HTTP content, domain A/CNAME answers and certificate status. DNS or certificate propagation may remain an external pending condition; distinguish configured settings from live verified HTTPS.

Run the narrowest real check for the change. Add the exact commands here when
the project selects its stack. A syntax check proves syntax; a unit test proves
its tested logic; neither proves UI, deployment, hardware, performance, safety,
or scientific validity unless it directly observes that surface.

## Gate 3: integrated readiness

Run proportionate build, test, lint, type, runtime, visual, device, security,
and compatibility checks for every affected boundary. Do not run an expensive
or irrelevant full matrix for a documentation-only edit.

## Gate 4: publication

1. Review status and diff; preserve unrelated changes.
2. Confirm only intended paths are staged.
3. Confirm all required gates passed. Website changes require a completed visual
   review. A missing rendering or failed check blocks publication.
4. Create one coherent commit under normal repository policy.
5. Push without force and without bypassing protection or secret scanning.
6. Verify the remote commit and required CI/deployment for that exact SHA.
   The Pages workflow verifies its staged artifact in Chromium and WebKit
   and publishes only after the rendered checks pass. The workflow keeps the
   screenshots as the `website-screenshots` artifact.

## Handoff evidence

Report exact commands or observed surfaces, results, untested scope, commit SHA,
remote synchronization, CI/deployment state, and whether `for-ai/` changed.
