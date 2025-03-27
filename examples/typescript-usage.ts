/**
 * TypeScript usage example for mcp-status-callback
 * 
 * This example shows how to use the module with TypeScript,
 * taking advantage of type definitions for better development experience.
 */

import {
    CallbackHandler,
    CallbackHandlerOptions,
    LogEventData,
    CallbackEventData,
    TunnelStatusEventData
} from '@deshartman/mcp-status-callback';

// Define a type for our application's callback payload
interface MyCallbackPayload {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    timestamp: string;
    data: {
        id: string;
        result?: any;
        error?: string;
    };
}

// Create a new instance with typed options
const options: CallbackHandlerOptions = {
    port: 4500 // Use a custom port
};

const callbackHandler = new CallbackHandler(options);

// Set up event listeners with proper typing
callbackHandler.on('log', (data: LogEventData) => {
    const { level, message } = data;
    console.log(`[${level.toUpperCase()}] ${message}`);
});

// Handle callbacks with type casting for our specific payload
callbackHandler.on('callback', (data: CallbackEventData) => {
    // Cast the message to our expected payload type
    const payload = data.message as MyCallbackPayload;

    console.log(`Received ${payload.status} callback at ${payload.timestamp}`);

    // Process based on status
    switch (payload.status) {
        case 'completed':
            console.log(`Task ${payload.data.id} completed successfully`);
            console.log('Result:', payload.data.result);
            break;
        case 'failed':
            console.log(`Task ${payload.data.id} failed`);
            console.log('Error:', payload.data.error);
            break;
        case 'processing':
            console.log(`Task ${payload.data.id} is processing`);
            break;
        case 'pending':
            console.log(`Task ${payload.data.id} is pending`);
            break;
    }
});

// Handle tunnel status with proper typing
callbackHandler.on('tunnelStatus', (data: TunnelStatusEventData) => {
    if (data.level === 'error') {
        const error = data.message instanceof Error
            ? data.message.message
            : data.message;

        console.error('Tunnel error:', error);
        process.exit(1);
    } else {
        const url = data.message;
        console.log(`Callback URL: ${url}`);

        // Store the URL for use in your application
        storeCallbackUrl(url);
    }
});

// Example function to store the callback URL
function storeCallbackUrl(url: string): void {
    console.log('Storing callback URL for later use:', url);
    // In a real application, you might store this in a database or configuration
}

// Start the callback handler with environment variables
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

if (!ngrokAuthToken) {
    console.error('NGROK_AUTH_TOKEN environment variable is required');
    process.exit(1);
}

// Define an async function to start the callback handler
const startCallbackHandler = async (): Promise<void> => {
    try {
        let url: string;

        // Start with optional custom domain
        if (customDomain) {
            console.log(`Using custom domain: ${customDomain}`);
            url = await callbackHandler.start(ngrokAuthToken, customDomain);

            // With a custom domain, you get a consistent URL every time
            // This is useful for:
            // - Configuring webhooks in third-party services
            // - Sharing a stable URL with team members
            // - Testing with consistent URLs across restarts
        } else {
            console.log('Using default Ngrok domain (random subdomain)');
            url = await callbackHandler.start(ngrokAuthToken);

            // Note: Custom domains require a paid Ngrok plan
            // See: https://ngrok.com/pricing
        }

        console.log(`Callback URL (from start): ${url}`);

        // You can use the URL directly here
        storeCallbackUrl(url);
    } catch (error) {
        console.error('Failed to start callback handler:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
};

// Start the callback handler
startCallbackHandler();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await callbackHandler.stop();
    console.log('Callback handler stopped');
    process.exit(0);
});
