# Agent workflow, context maintenance, and Git policy

## Working loop

1. Read `AGENTS.md`, then the router, durable project goal, and active checklist.
   Resume GSD state when present; keep one task-state owner.
2. Inspect Git status, branch, remotes, existing worktrees, and task-owned code.
   Follow the shared skill baseline in `SKILLS.md`.
3. Preserve user work and distinguish pre-existing failures from regressions.
4. Apply YAGNI: check the existing owner before adding anything.
5. Implement one bounded outcome and run the full visual checks in [Gate 2](./VERIFICATION.md#gate-2-rendered-verification-after-every-repository-change) after every repository change.
6. Review the diff for accidental scope, secrets, generated output, and stale
   context.
7. Update the active checklist with evidence, blockers, and the next concrete
   action. Record observed branch/commit/publication state for the next session.
   Publish and verify the live page as described below.

## Control-plane update triggers

Update the narrowest canonical file in the same change when any durable fact
changes:

- project goal, non-goal, user workflow, or supported surface;
- module ownership, architecture boundary, external contract, or schema;
- required skill route or verified fallback;
- acceptance criterion, validation command, evidence limit, or release gate;
- security, privacy, safety, licensing, or publication boundary;
- durable decision or repeatedly rediscovered failure mode.

Keep chat transcripts, daily narration, raw logs, private machine paths,
speculative ideas, secrets, and participant data out of durable policy. Keep
short last-observed branch/commit state, blockers, and next action in the active
task handoff owner. Recheck that state at the next session; Git and source
remain authoritative.

## Git checkpoints and publication

Use Git history for versions and rollback. Reuse native Codex worktrees; use
`superpowers-using-git-worktrees` when substantial work needs isolation. Never
create duplicate source folders for versioning. Preserve uncommitted work and
require explicit authorization before destructive resets or worktree removal.

- Inspect status and diff before and after edits.
- Stage explicit paths; never absorb unrelated work to make the tree clean.
- Keep one coherent concern per commit and checkpoint meaningful milestones.
- The current standing user instruction is to publish completed repository
  changes to GitHub Pages, including documentation, control-plane, and tooling
  updates. Follow any publication limit the user sets for the current task and
  respect the repository's branch/PR policy.
- Never force-push, rewrite shared history, bypass branch protection, bypass
  secret scanning, or publish known-broken/private material.
- If credentials, network, CI, conflicts, ownership, or validation block
  publication, report the exact blocker and preserve the ready local state.
- Follow [Gate 4](./VERIFICATION.md#gate-4-publication-and-live-visual-verification)
  for every release. The agent who publishes must verify the exact deployment,
  run the full rendered suite on the live page, and inspect the live screenshots
  before marking the release complete.

## Self-review

Run `for-ai/scripts/check-context.ps1`. Then review control-plane changes for
contradictions, duplication, stale facts, oversized always-read material, and
rules that lack a current consumer. Consolidate or delete rather than append
forever.

## Itemized handoff

- Outcome and affected product surfaces.
- Intended files changed; unrelated work left untouched.
- Verification run, result, and evidence limitations.
- `for-ai/` update: yes/no and why.
- Commit SHA, branch, remote sync, CI/deployment result.
- Remaining blocker or next smallest product decision.
