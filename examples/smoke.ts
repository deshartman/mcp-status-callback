/**
 * Smoke test for @deshartman/mcp-status-callback.
 *
 * Starts the handler, prints the ngrok callback URL, and shuts down after 10s.
 * Requires NGROK_AUTH_TOKEN (and optional NGROK_CUSTOM_DOMAIN) in the environment
 * (or a .env file at repo root).
 *
 * Run: `pnpm build && node --env-file=.env build-check/smoke.js`
 * Or from source with tsx: `pnpm dlx tsx examples/smoke.ts`
 */
import 'dotenv/config';
import { CallbackHandler } from '../src/index.js';

const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

if (!ngrokAuthToken) {
    console.error('NGROK_AUTH_TOKEN is required (set it in .env)');
    process.exit(1);
}

const handler = new CallbackHandler({
    ngrokAuthToken,
    customDomain,
    logger: console,
    onCallback: ({ queryParameters, body }) => {
        console.log('Received callback:');
        console.log('  query:', queryParameters);
        console.log('  body:', body);
    },
});

const url = await handler.start();
console.log(`Callback URL: ${url}`);
console.log('Shutting down in 10s...');

setTimeout(async () => {
    await handler.stop();
    console.log('Stopped.');
}, 10_000);
