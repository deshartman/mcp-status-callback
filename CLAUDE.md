# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-purpose npm library (`@deshartman/mcp-status-callback`) that spins up a local Express server behind an Ngrok tunnel so external services (Twilio, MCP hosts, generic webhooks) can hit a `/callback` endpoint on a developer's laptop. Published as ESM-only, Node 18+.

## Commands

Build and dev (run from repo root):

```bash
npm run build    # tsc → build/  (also chmods build/index.js executable)
npm run dev      # ts-node src/index.ts  (not typically useful — this is a library)
npm publish      # runs `prepublishOnly` → build first
```

Tests live in [test/](test/) as a **separate npm project** that consumes the parent via `"@deshartman/mcp-status-callback": "file:../"`. This means the test suite exercises the **built output**, not the TypeScript source — so `npm run build` at the root is a prerequisite before iterating on tests.

```bash
# From test/
npm run test:js      # node test.js       (JS smoke test against local package)
npm run test:ts      # tsx test.ts        (TS smoke test, run directly)
npm run test:build   # tsc && node dist/test.js
```

Tests require `test/.env` with `NGROK_AUTH_TOKEN` (and optional `NGROK_CUSTOM_DOMAIN`). There is no unit-test framework — the "tests" are manual smoke scripts that start the handler, log the tunnel URL, and stop after 10 seconds. To iterate: rebuild root → run `npm run test:ts` in `test/` → hit the printed URL with curl/Postman.

## Architecture

The whole library is one class: [src/CallbackHandler.ts](src/CallbackHandler.ts). [src/index.ts](src/index.ts) is just re-exports.

Flow inside `CallbackHandler.start()`:

1. Try to `app.listen(4000)`. On `EADDRINUSE`, recursively retry `port + 1` until a port is free (auto port-finding — no config needed).
2. Once Express is listening, call `ngrok.forward({ addr: port, authtoken, domain: customDomain })` from `@ngrok/ngrok` (official SDK, as of 0.5.0 — the community package was replaced).
3. Resolve the returned Promise with `${ngrokUrl}/callback` — this is what callers use as the webhook target.

Two Express routes: `GET /` (health check) and `POST /callback` (the actual endpoint). The `/callback` handler emits a `CALLBACK` event with `{ queryParameters, body }` and always returns `200 Callback received`.

### Content-type coercion

When a POST arrives as `application/x-www-form-urlencoded` (Twilio's default), the handler shallow-clones the express-parsed body to normalize it into a plain JSON object before emitting. Listeners can therefore assume `data.body` is JSON regardless of the wire format. This behavior is load-bearing for Twilio callbacks — don't remove it.

### Event API

Three events, exported as typed string constants via `CallbackHandlerEventNames`:

- `LOG` — internal diagnostics (port retry, tunnel status, errors)
- `CALLBACK` — a request hit `/callback`; payload is `{ queryParameters, body }`
- `TUNNEL_STATUS` — tunnel came up (message is the callback URL) or errored

`CallbackHandler` subclasses `EventEmitter` and overrides `on`/`once`/`emit` with generics keyed on `CallbackHandlerEvents` so listener signatures are type-checked. Preserve this pattern when adding events — don't fall back to untyped `on(string, Function)`.

## Module system gotchas

- ESM-only: `"type": "module"` + `tsconfig` uses `NodeNext` module resolution.
- Internal imports must use the `.js` extension on `.ts` source (e.g. `from './CallbackHandler.js'` in [src/index.ts](src/index.ts)). This is a NodeNext requirement, not a typo. If you refactor imports and drop the `.js`, the built output will fail to resolve.
- `build/` is committed to git and is the only thing published (see `files` in [package.json](package.json)).

## Release checklist

`prepublishOnly` runs the build, so `npm publish` alone is enough — but bump the version in [package.json](package.json) and add an entry to [CHANGELOG.md](CHANGELOG.md) first (the changelog is maintained by hand, one section per version).
