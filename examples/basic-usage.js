/**
 * Basic usage example for mcp-status-callback
 * 
 * This example shows how to set up a callback handler, listen for events,
 * and use the callback URL in your application.
 */

// Import constants along with the class
import { CallbackHandler, CallbackHandlerEventNames } from '@deshartman/mcp-status-callback';

// Get Ngrok auth token and optional custom domain
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN || 'YOUR_NGROK_AUTH_TOKEN';
// Optional: Custom domain (requires Ngrok paid plan)
const customDomain = process.env.NGROK_CUSTOM_DOMAIN || '';

// Create a new instance with Ngrok auth token and optional custom domain
const callbackHandler = new CallbackHandler({
    ngrokAuthToken: ngrokAuthToken,
    customDomain: customDomain || undefined
});

// Set up event listeners for logs (only errors and warnings) using constants
callbackHandler.on(CallbackHandlerEventNames.LOG, (data) => {
    if (data.level === 'error' || data.level === 'warn') {
        console.log(`[${data.level.toUpperCase()}] ${data.message}`);
    }
});

// Listen for callbacks using constants
callbackHandler.on(CallbackHandlerEventNames.CALLBACK, (data) => {
    // Log a simplified version of the callback data
    console.log('Received callback:');

    // Only log query parameters if they exist and are relevant
    if (data.queryParameters && Object.keys(data.queryParameters).length > 0) {
        console.log('Query parameters:', data.queryParameters);
    }

    // Log the body data
    console.log('Body:', JSON.stringify(data.body, null, 2));

    // Process based on status
    if (data.body.status === 'completed') {
        console.log('Processing completed callback...');
    } else if (data.queryParameters?.priority === 'high' && data.body.status === 'failed') {
        console.log('⚠️ High priority task failed!');
    }
});

// Listen for tunnel status updates using constants
callbackHandler.on(CallbackHandlerEventNames.TUNNEL_STATUS, (data) => {
    if (data.level === 'error') {
        console.error('Failed to establish tunnel:', data.message);
        process.exit(1);
    } else {
        console.log(`🚀 Callback URL ready: ${data.message}`);
    }
});

if (ngrokAuthToken === 'YOUR_NGROK_AUTH_TOKEN') {
    console.log('⚠️  Ngrok auth token required');
    process.exit(1);
}

// Define an async function to start the callback handler
const startCallbackHandler = async () => {
    try {
        // Start the callback handler
        await callbackHandler.start();

        // Log domain info only if using custom domain
        if (customDomain) {
            console.log(`Using custom domain: ${customDomain}`);
        }
    } catch (error) {
        console.error('Failed to start callback handler:', error);
        process.exit(1);
    }
};

// Start the callback handler
console.log('Starting callback handler... (Press Ctrl+C to stop)');
startCallbackHandler();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await callbackHandler.stop();
    process.exit(0);
});
