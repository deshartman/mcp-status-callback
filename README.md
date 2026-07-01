# MCP Status Callback

A utility for handling API callbacks via Ngrok tunnels. Especially useful for MCP (Model Context Protocol) status callbacks and Twilio webhooks during local development.

This module starts a local Express server, fronts it with an Ngrok tunnel, and forwards `POST /callback` requests to a handler you supply.

## Installation

```bash
npm install @deshartman/mcp-status-callback
# or
pnpm add @deshartman/mcp-status-callback
```

## Requirements

- Node.js 22 or higher
- An Ngrok account and auth token (get one at [ngrok.com](https://ngrok.com))

## Usage

### JavaScript

```javascript
import { CallbackHandler } from '@deshartman/mcp-status-callback';

const handler = new CallbackHandler({
    ngrokAuthToken: process.env.NGROK_AUTH_TOKEN,
    // customDomain: 'your-domain.ngrok.dev',  // optional, requires paid Ngrok plan
    logger: console, // optional, defaults to a no-op logger
    onCallback: ({ queryParameters, body }) => {
        console.log('Received callback:', { queryParameters, body });
        // ...process the callback
    },
});

const url = await handler.start();
console.log(`Callback URL: ${url}`);

// When you're done:
// await handler.stop();
```

### TypeScript

```typescript
import { CallbackHandler } from '@deshartman/mcp-status-callback';
import type { CallbackData, CallbackHandlerOptions, Logger } from '@deshartman/mcp-status-callback';

const logger: Logger = console;

const options: CallbackHandlerOptions = {
    ngrokAuthToken: process.env.NGROK_AUTH_TOKEN!,
    customDomain: process.env.NGROK_CUSTOM_DOMAIN,
    logger,
    onCallback: async ({ queryParameters, body }: CallbackData) => {
        // handle callback (async allowed — the 200 response waits for you)
    },
};

const handler = new CallbackHandler(options);
const url = await handler.start();
```

## API Reference

### `new CallbackHandler(options)`

- `options.ngrokAuthToken` (required) — Your Ngrok auth token.
- `options.customDomain` (optional) — Custom Ngrok domain (paid plan).
- `options.onCallback` (required) — `(data: CallbackData) => void | Promise<void>`. Invoked for every `POST /callback`. The Express handler `await`s this before returning `200`, so throwing or hanging is visible upstream.
- `options.logger` (optional) — A `Logger` (`{ info, warn, error }`). Anything structurally matching the interface — `console`, `pino`, `winston`, or a custom object — is accepted. Defaults to a no-op logger (silent).

### Methods

- `start(): Promise<string>` — Starts the server and tunnel. Resolves to the callback URL (e.g. `https://xxxx.ngrok.app/callback`).
- `stop(): Promise<void>` — Closes the tunnel and stops the server.
- `getPublicUrl(): string | null` — Returns the current tunnel URL (without `/callback`) or `null` if not started.

### Types

- `CallbackData` — `{ queryParameters: Record<string, unknown>; body: unknown }`
- `Logger` — `{ info(msg: string): void; warn(msg: string): void; error(msg: string | Error): void }`
- `CallbackHandlerOptions` — see above

## Behavior notes

- **Automatic port finding.** If port 4000 is in use, the handler retries `port + 1` until one is free. The retry is logged via `logger.warn`.
- **Content-type coercion.** `application/x-www-form-urlencoded` bodies (Twilio's default) are normalized to a plain JSON object before `onCallback` is invoked, so `body` is always a JSON object regardless of wire format.
- **Async-aware response.** `onCallback` may return a Promise; the `200` response is not sent until it resolves. If `onCallback` throws, the handler responds `500` and logs the error via `logger.error`.

## Contributing

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

Manual smoke run against a real ngrok tunnel (requires `.env` with `NGROK_AUTH_TOKEN`):

```bash
pnpm dlx tsx examples/smoke.ts
```

## License

MIT
