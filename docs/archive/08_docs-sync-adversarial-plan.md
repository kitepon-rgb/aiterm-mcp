# Docs sync adversarial verification plan

Date: 2026-07-07

Goal: Bring all tracked project documentation into agreement with the current
`v0.9.1` release, installed global command, registry state, CI state, and
agent_done/Codex managed home behavior, then adversarially verify the docs
before commit and push.

## Tasks

- [x] Inventory tracked documentation and current release/install evidence.
- [x] Update stale release/version/test-count/install/registry references.
- [x] Run adversarial documentation verification from independent perspectives.
- [x] Reflect valid verification findings into docs.
- [x] Run local verification gates.
- [x] Commit and push the resulting documentation update.

## Adversarial Verification Result

- Fermat: stale test count in `CONTRIBUTING.md`, stale CI wording in PR docs, stale `docs/PROMOTION.md` live status, and completed `docs/03_audit-sweep-2026-07.md` still living at top level were valid findings.
- Ramanujan: stale `CHANGELOG.md` Unreleased content, `rag/manifest.json` 167-test summary, and completed plan/document naming drift were valid findings.
- Reflected: docs now say `v0.9.1` / 168 tests / current CI shape, RAG manifest is aligned with edited source notes, completed plans are archived or relabeled as historical design notes; `docs/03_audit-sweep-2026-07.md` moved to `docs/archive/03_audit-sweep-2026-07.md`.
