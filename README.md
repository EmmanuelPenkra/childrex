# Childrex Sequence

A server-authoritative multiplayer Sequence game for `https://childrex.com/sequence`.

## Local development

Requirements: Node 24, pnpm 11.26, and Chromium for browser tests.

```sh
pnpm install --frozen-lockfile
pnpm assets:prepare
pnpm dev
```

The application listens on port 3000 by default. `pnpm verify` runs lint, both TypeScript configurations, engine/server tests, and a production build. `pnpm test:e2e` launches an isolated test server and two separate Chrome contexts, with screenshots, video, and a Playwright trace under `test-results/`.

## Runtime

Set `DATA_FILE=/data/rooms.json` for atomic restart persistence. The production Compose file mounts only `/srv/childrex-sequence/data`, joins the existing `nginx-proxy` network, runs as a non-root user with no capabilities, and exposes no host port. The root route serves a Childrex placeholder; the game is under `/sequence/`.

The complete product, interaction, rules, QA, and operations contract is in `SEQUENCE_IMPLEMENTATION_PLAN.md`.
