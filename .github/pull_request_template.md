## Summary

<!-- What changes, and why? Link any related issue. -->

## Type

- [ ] Bug fix
- [ ] New feature / behavior change
- [ ] Docs
- [ ] Refactor / internal
- [ ] CI / tooling

## Testing

- [ ] `npm test` passes locally **with tmux installed**
- Platforms exercised: <!-- macOS / Linux / WSL2 / native Windows -->

## Checklist

- [ ] Scoped change — no unrelated edits; the tool surface is unchanged (or the change is justified above)
- [ ] No new stdout output (stdout is JSON-RPC only; diagnostics go to stderr)
- [ ] Docs updated where relevant (README, `CHANGELOG.md`, and `docs/01_design-plan.md` for design behavior)
- [ ] No new runtime dependency (or justified)

<!-- CI runs ubuntu + macos on Node 18/20/22. Native Windows runs tmux-independent tests on Node 20/22 as a required publish gate; the WSL tmux bridge is still manual. Publishing is automated on v* tags — contributors don't publish. -->
