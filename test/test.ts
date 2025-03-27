/**
 * TypeScript test for mcp-status-callback
 * 
 * This test verifies that the local module can be imported and used correctly with TypeScript.
 * Uses environment variables from .env file for Ngrok authentication.
 */

// Import modules at the top level
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the test directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Define an async function to run the test
const runTest = async (): Promise<void> => {
    try {
        // Import the module
        const module = await import('../build/index.js');
        const { CallbackHandler } = module;

        // Create a new instance with default options
        const callbackHandler = new CallbackHandler();

        console.log('CallbackHandler instance created successfully');

        // Set up event listeners with type 'any' to avoid type errors
        callbackHandler.on('log', (data: any) => {
            console.log(`[${data.level.toUpperCase()}] ${data.message}`);
        });

        callbackHandler.on('callback', (data: any) => {
            console.log('Received callback data:', data.message);
        });

        callbackHandler.on('tunnelStatus', (data: any) => {
            if (data.level === 'error') {
                const error = data.message instanceof Error
                    ? data.message.message
                    : data.message;
                console.error('Tunnel error:', error);
            } else {
                console.log(`Callback URL: ${data.message}`);
            }
        });

        // Use the Ngrok auth token from .env
        const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
        const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

        console.log('Starting CallbackHandler...');
        console.log(`Using Ngrok auth token: ${ngrokAuthToken ? '✓ (from .env)' : '✗ (not found)'}`);
        console.log(`Using custom domain: ${customDomain || 'None'}`);

        // Start the handler with the Ngrok auth token from .env
        if (ngrokAuthToken) {
            try {
                // Start the handler and wait for the URL
                const url = await callbackHandler.start(ngrokAuthToken, customDomain);
                console.log(`Callback URL: ${url}`);

                // In a real test, you would use the URL here

                // Stop after a short delay
                console.log('Test completed successfully. Stopping in 10 seconds...');
                setTimeout(async () => {
                    try {
                        await callbackHandler.stop();
                        console.log('CallbackHandler stopped');
                    } catch (err) {
                        console.error('Error stopping CallbackHandler:', err);
                    }
                }, 10000);
            } catch (error) {
                console.error('Error starting CallbackHandler:', error);

                // Clean up
                try {
                    await callbackHandler.stop();
                } catch (err) {
                    console.error('Error stopping CallbackHandler:', err);
                }
            }
        } else {
            console.error('Error: NGROK_AUTH_TOKEN not found in .env file');
        }

        // Log that the test script is running
        console.log('Test script is running...');

    } catch (error) {
        console.error('Test error:', error);
    }
};

// Run the test
runTest();
