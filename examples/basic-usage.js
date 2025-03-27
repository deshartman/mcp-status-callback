/**
 * Basic usage example for mcp-status-callback
 * 
 * This example shows how to set up a callback handler, listen for events,
 * and use the callback URL in your application.
 */

import { CallbackHandler } from '@deshartman/mcp-status-callback';

// Create a new instance with default port (4000)
const callbackHandler = new CallbackHandler();

// Set up event listeners for logs
callbackHandler.on('log', (data) => {
    console.log(`[${data.level.toUpperCase()}] ${data.message}`);
});

// Listen for callbacks
callbackHandler.on('callback', (data) => {
    console.log('Received callback data:');
    console.log(JSON.stringify(data.message, null, 2));

    // Here you would process the callback data according to your application needs
    // For example:
    if (data.message.status === 'completed') {
        console.log('Processing completed callback...');
        // Do something with the completed status
    }
});

// Listen for tunnel status updates
callbackHandler.on('tunnelStatus', (data) => {
    if (data.level === 'error') {
        console.error('Failed to establish tunnel:', data.message);
        process.exit(1);
    } else {
        console.log('\n=================================================');
        console.log(`🚀 Callback URL ready: ${data.message}`);
        console.log('=================================================\n');

        console.log('Use this URL in your API requests that require a callback URL.');
        console.log('For example, with curl:');
        console.log(`curl -X POST ${data.message} -H "Content-Type: application/json" -d '{"status":"completed","data":{"id":"123"}}'`);

        // In a real application, you would use this URL when making API requests
        // that require a callback URL parameter
    }
});

// Start the callback handler with your Ngrok auth token
// Replace 'YOUR_NGROK_AUTH_TOKEN' with your actual token
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN || 'YOUR_NGROK_AUTH_TOKEN';
// Optional: Custom domain (requires Ngrok paid plan)
const customDomain = process.env.NGROK_CUSTOM_DOMAIN || '';

if (ngrokAuthToken === 'YOUR_NGROK_AUTH_TOKEN') {
    console.log('⚠️  Please set your Ngrok auth token in the code or as an environment variable NGROK_AUTH_TOKEN');
    console.log('   Get your auth token at: https://dashboard.ngrok.com/get-started/your-authtoken');
    process.exit(1);
}

// Start the callback handler
// If you have a paid Ngrok plan, you can use a custom domain
if (customDomain) {
    console.log(`Using custom domain: ${customDomain}`);
    callbackHandler.start(ngrokAuthToken, customDomain);
} else {
    console.log('Using default Ngrok domain (random subdomain)');
    callbackHandler.start(ngrokAuthToken);
    console.log('Tip: With a paid Ngrok plan, you can use a custom domain for a consistent URL');
    console.log('     Set NGROK_CUSTOM_DOMAIN environment variable or pass it as the second parameter');
    console.log('     Example: callbackHandler.start(ngrokAuthToken, "your-domain.ngrok.io")');
}

console.log('Starting callback handler...');
console.log('Press Ctrl+C to stop');

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await callbackHandler.stop();
    console.log('Callback handler stopped');
    process.exit(0);
});
