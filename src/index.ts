#!/usr/bin/env node
import { callbackHandler } from "./utils/callbackHandler.js";


/****************************************************
 * 
 *                  Callback Handler
 *  
 ****************************************************/
let statusCallback = "";    // this is the URL to use for any status callbacks to the MCP server

// Set up event listeners for callback handler logs
callbackHandler.on('log', (data) => {
    // Log the callback handler logs
    console.log(`Callback log: ${data.level}: ${data.message}`);
});

// Add event listener for callback events
callbackHandler.on('callback', (data) => {
    // Log the callback data
    console.log(`Received callback: ${JSON.stringify(data.message)}`);
});

// Add event listener for callback ready event
callbackHandler.on('tunnelStatus', (data) => {
    if (data.level === 'error') {
        // Log the tunnel failure
        console.log(`Failed to establish tunnel.: ${data.message}`);
    } else {
        // Log the tunnel URL
        console.log(`Tunnel Established to URL: ${data.message}`);

        // Assign the URL to the statusCallback variable to use in your code.
        statusCallback = data.message;
        console.log(`\n\n <<<<<<<<<<<<  Status Callback URL: ${statusCallback} >>>>>>>>>>>>`);
    }
});

// Start the callback handler
callbackHandler.start();

