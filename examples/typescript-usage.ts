/**
 * TypeScript usage example for @deshartman/mcp-status-callback (v1.0+).
 *
 * Shows dependency-injected onCallback and logger, plus payload typing.
 */
import { CallbackHandler } from '@deshartman/mcp-status-callback';
import type { CallbackData, CallbackHandlerOptions, Logger } from '@deshartman/mcp-status-callback';

interface MyCallbackPayload {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: string;
    data: {
        id: string;
        result?: unknown;
        error?: string;
    };
}

const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
if (!ngrokAuthToken) {
    console.error('NGROK_AUTH_TOKEN is required');
    process.exit(1);
}

const logger: Logger = console;

const options: CallbackHandlerOptions = {
    ngrokAuthToken,
    customDomain: process.env.NGROK_CUSTOM_DOMAIN,
    logger,
    onCallback: async ({ queryParameters, body }: CallbackData) => {
        const payload = body as MyCallbackPayload;
        console.log(`Received ${payload.status} callback at ${payload.timestamp}`);

        switch (payload.status) {
            case 'completed':
                console.log(`Task ${payload.data.id} completed`, payload.data.result);
                break;
            case 'failed':
                console.log(`Task ${payload.data.id} failed:`, payload.data.error);
                break;
            case 'processing':
            case 'pending':
                console.log(`Task ${payload.data.id} is ${payload.status}`);
                break;
        }

        if (queryParameters.priority === 'high' && payload.status === 'failed') {
            console.log('High priority task failed — sending urgent notification...');
        }
    },
};

const handler = new CallbackHandler(options);

try {
    const url = await handler.start();
    console.log(`Callback URL: ${url}`);
} catch (error) {
    console.error('Failed to start:', error instanceof Error ? error.message : String(error));
    process.exit(1);
}

process.on('SIGINT', async () => {
    await handler.stop();
    process.exit(0);
});
