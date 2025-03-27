#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { callbackHandler } from "./utils/callbackHandler.js";

/****************************************************
 * 
 *                      MCP server
 *  
 ****************************************************/

// Server configuration with clear naming for the messaging service
const SERVER_CONFIG = {
    name: "CallbackMCPServer",
    description: "MCP server to demonstrate status callbacks",
    version: "1.0.0"
};

const mcpServer = new McpServer(SERVER_CONFIG, {
    capabilities: {
        logging: {}
    }
});

// Define schemas for tool inputs
const testToolSchema = z.object({
    message: z.string().describe("Test Message")
});

// Create a simple dummy mcpServer.tool that just returns a ping response
mcpServer.tool(
    "testTool",
    "Test Tool",
    testToolSchema.shape,
    async (params, extra) => {
        return {
            content: [
                {
                    type: "text",
                    text: "Hello from the MCP server!"
                }
            ]
        };
    }
);

// Helper function to forward logs to the MCP server
const logToMcp = (data: { level: string, message: string }) => {
    // Only use valid log levels: info, error, debug
    // If level is 'warn', treat it as 'info'
    const mcpLevel = data.level === 'warn' ? 'info' : data.level as "info" | "error" | "debug";

    // Send the log message to the MCP server's underlying Server instance
    mcpServer.server.sendLoggingMessage({
        level: mcpLevel,
        data: data.message,
    });
};

// Set up event listeners for callback handler logs
callbackHandler.on('log', logToMcp);

// Add event listener for callback events
callbackHandler.on('callback', (data) => {
    // Log the callback data
    logToMcp({ level: 'info', message: `Received callback: ${JSON.stringify(data)}` });
});

// Add event listener for ngrok ready event
callbackHandler.on('ngrokReady', (url) => {
    logToMcp({ level: 'info', message: `Ngrok URL ready: ${url}` });
});

// Start the callback handler
callbackHandler.start();

// Start the server
async function main() {
    try {
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
    } catch (error) {
        // We can't use MCP logging here since the server isn't connected yet
        console.error(`Error starting server: ${error}`);
        process.exit(1);
    }
}

// Handle clean shutdown
process.on("SIGINT", async () => {
    // Log shutdown message
    logToMcp({ level: 'info', message: "MCP Callback Server shutting down..." });
    await callbackHandler.stop(); // Use await here since stop is now async
    await mcpServer.close();
    process.exit(0);
});

// Start the server
main().catch(error => {
    // We can't use MCP logging here since the server isn't connected yet
    console.error(`Fatal error: ${error}`);
    process.exit(1);
});
