/**
 * TypeScript test for mcp-status-callback
 * 
 * This test verifies that the local module can be imported and used correctly with TypeScript.
 * Uses environment variables from .env file for Ngrok authentication.
 */

// Import modules at the top level
import * as dotenv from 'dotenv';
import * as path from 'path';
// Import types from the main module
import type { CallbackEventData, LogEventData, TunnelStatusEventData } from '../src/CallbackHandler.js';

// Load .env file from the test directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Define an async function to run the test
const runTest = async (): Promise<void> => {
    try {
        // Import the module - using a path that works after compilation to dist/
        // @ts-ignore - This path works at runtime after compilation
        const { CallbackHandler } = await import('../../build/index.js');

        // // Alternative import method
        // const module = await import('../../build/index.js');
        // const { CallbackHandler } = module;

        // Get the Ngrok auth token from .env
        const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
        const customDomain = process.env.NGROK_CUSTOM_DOMAIN;

        console.log('Starting CallbackHandler...');
        console.log(`Using Ngrok auth token: ${ngrokAuthToken ? '✓ (from .env)' : '✗ (not found)'}`);
        console.log(`Using custom domain: ${customDomain || 'None'}`);

        if (!ngrokAuthToken) {
            console.error('Error: NGROK_AUTH_TOKEN not found in .env file');
            return;
        }

        // Create a new instance with options
        const callbackHandler = new CallbackHandler({
            ngrokAuthToken,
            customDomain: customDomain || undefined
        });

        console.log('CallbackHandler instance created successfully');

        // Set up event listeners
        callbackHandler.on('log', (data: LogEventData) => {
            console.log(`[${data.level.toUpperCase()}] ${data.message}`);
        });

        callbackHandler.on('callback', (data: CallbackEventData) => {
            console.log('Received callback query parameters:', data.queryParameters);
            console.log('Received callback body:', data.body);
        });

        callbackHandler.on('tunnelStatus', (data: TunnelStatusEventData) => {
            if (data.level === 'error') {
                const error = data.message instanceof Error
                    ? data.message.message
                    : data.message;
                console.error('Tunnel error:', error);
            } else {
                console.log(`Callback URL: ${data.message}`);
            }
        });

        // Start the handler and wait for the URL
        try {
            const url = await callbackHandler.start();
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

        // Log that the test script is running
        console.log('Test script is running...');
    } catch (error) {
        console.error('Test error:', error);
    }
};

// Run the test
runTest();
