# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-purpose npm library (`@deshartman/mcp-status-callback`) that spins up a local Express server behind an Ngrok tunnel so external services (Twilio, MCP hosts, generic webhooks) can hit a `/callback` endpoint on a developer's laptop. Published as ESM-only, Node 22+.

## Commands

All scripts are pnpm-based. Run from repo root:

```bash
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint src test examples
pnpm format        # prettier --write
pnpm format:check  # prettier --check
pnpm test          # vitest run (tests src/ directly, no build step)
pnpm test:watch
pnpm test:coverage
pnpm build         # tsc → build/ (also chmods build/index.js executable)
```

`prepublishOnly` runs `pnpm build`, so `pnpm publish` alone is enough to publish.

## Testing

Tests use **vitest** and import from `src/` directly — no build step is required to iterate on tests. Test files live at `test/**/*.test.ts`.

`@ngrok/ngrok` is mocked in tests (`vi.mock('@ngrok/ngrok', ...)`) so tests don't hit real ngrok. The Express layer is tested against a real Express instance via `supertest`.

For a real end-to-end smoke test against an actual ngrok tunnel, use [examples/smoke.ts](examples/smoke.ts). Requires `NGROK_AUTH_TOKEN` in `.env`.

## Architecture

The whole library is one class: [src/CallbackHandler.ts](src/CallbackHandler.ts). [src/index.ts](src/index.ts) is just re-exports.

Flow inside `CallbackHandler.start()`:

1. Try to `app.listen(4000)`. On `EADDRINUSE`, recursively retry `port + 1` until a port is free.
2. Once Express is listening, call `ngrok.forward({ addr: port, authtoken, domain: customDomain })` from `@ngrok/ngrok`.
3. Resolve the returned Promise with `${ngrokUrl}/callback`.

Two Express routes: `GET /` (health check) and `POST /callback` (the actual endpoint). The `/callback` handler `await`s the injected `onCallback` before responding `200`.

### Content-type coercion

When a POST arrives as `application/x-www-form-urlencoded` (Twilio's default), the handler shallow-clones the express-parsed body to normalize it into a plain JSON object before invoking `onCallback`. Consumers can therefore assume `data.body` is JSON regardless of the wire format. This behavior is load-bearing for Twilio callbacks — don't remove it.

### Public API (v1.0+)

Dependency-injected callbacks, no `EventEmitter`:

```typescript
const handler = new CallbackHandler({
    ngrokAuthToken,        // required
    customDomain,          // optional
    onCallback: ({ queryParameters, body }) => { /* ... */ },  // required, may be async
    logger,                // optional; defaults to no-op
});
```

- `onCallback` is `await`ed before the `200` response — a throw becomes a `500` with `logger.error(...)`. This future-proofs for WSS-ack semantics in the callback-relay branch.
- `logger` is structural — `console`, pino, winston, or any object with `info`/`warn`/`error` methods works.
- No `TUNNEL_STATUS` event: the URL is `start()`'s return value; tunnel errors surface via `logger.error()` and reject `start()`.

## Module system gotchas

- ESM-only: `"type": "module"` + `tsconfig` uses `NodeNext` module resolution.
- `verbatimModuleSyntax: true` is on — types must be re-exported via `export type`, not `export`.
- Internal imports must use the `.js` extension on `.ts` source (e.g. `from './CallbackHandler.js'`). NodeNext requirement.
- `build/` is committed to git and is the only thing published (see `files` in [package.json](package.json)).

## Release checklist

`prepublishOnly` runs the build, so `pnpm publish` alone is enough — but bump the version in [package.json](package.json) and add an entry to [CHANGELOG.md](CHANGELOG.md) first (the changelog is maintained by hand, one section per version).
