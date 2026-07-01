/**
 * Basic usage example for @deshartman/mcp-status-callback (v1.0+).
 *
 * Set NGROK_AUTH_TOKEN in your environment (and optionally NGROK_CUSTOM_DOMAIN).
 */
import { CallbackHandler } from '@deshartman/mcp-status-callback';

const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
const customDomain = process.env.NGROK_CUSTOM_DOMAIN || undefined;

if (!ngrokAuthToken) {
    console.error('NGROK_AUTH_TOKEN is required');
    process.exit(1);
}

const handler = new CallbackHandler({
    ngrokAuthToken,
    customDomain,
    logger: console,
    onCallback: ({ queryParameters, body }) => {
        if (queryParameters && Object.keys(queryParameters).length > 0) {
            console.log('Query parameters:', queryParameters);
        }
        console.log('Body:', JSON.stringify(body, null, 2));

        if (body?.status === 'completed') {
            console.log('Processing completed callback...');
        } else if (queryParameters?.priority === 'high' && body?.status === 'failed') {
            console.log('High priority task failed!');
        }
    },
});

try {
    const url = await handler.start();
    console.log(`Callback URL ready: ${url}`);
    if (customDomain) {
        console.log(`Using custom domain: ${customDomain}`);
    }
} catch (error) {
    console.error('Failed to start callback handler:', error);
    process.exit(1);
}

process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await handler.stop();
    process.exit(0);
});
