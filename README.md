# MCP Status Callback

A utility for handling API callbacks via Ngrok tunnels. Especially useful for MCP (Model Context Protocol) status callbacks.

This module creates a local Express server and establishes an Ngrok tunnel to it, allowing external services to send callbacks to your local development environment.

## Installation

```bash
npm install @deshartman/mcp-status-callback
```

## Requirements

- Node.js 14 or higher
- An Ngrok account and auth token (get one at [ngrok.com](https://ngrok.com))

## Usage

### Basic Usage

```javascript
import { CallbackHandler } from '@deshartman/mcp-status-callback';

// Create a new instance
const callbackHandler = new CallbackHandler({ port: 4000 });

// Set up event listeners
callbackHandler.on('log', (data) => {
  console.log(`${data.level}: ${data.message}`);
});

callbackHandler.on('callback', (data) => {
  console.log('Received callback:', data.message);
  // Process the callback data here
});

callbackHandler.on('tunnelStatus', (data) => {
  if (data.level === 'error') {
    console.error('Tunnel error:', data.message);
  } else {
    console.log('Callback URL:', data.message);
    // Use this URL in your API requests
  }
});

// Start the server with your Ngrok auth token
// The start method returns a Promise that resolves to the public callback URL
const ngrokAuthToken = 'your-ngrok-auth-token';

// Using async/await with try/catch
(async () => {
  try {
    // start() now returns the public URL directly
    const publicUrl = await callbackHandler.start(ngrokAuthToken);
    console.log(`Server started! Use this URL for callbacks: ${publicUrl}`);
    // You can now use this URL in your API requests
  } catch (error) {
    console.error('Failed to start callback handler:', error);
  }
})();

// Optional: Use a custom domain (requires Ngrok paid plan)
// async function startWithCustomDomain() {
//   try {
//     const publicUrl = await callbackHandler.start(ngrokAuthToken, 'your-custom-domain.ngrok.io');
//     console.log(`Custom domain callback URL: ${publicUrl}`);
//   } catch (error) {
//     console.error('Failed to start with custom domain:', error);
//   }
// }

// When you're done, stop the server
// await callbackHandler.stop();
```

### TypeScript Usage

```typescript
import { CallbackHandler, CallbackEventData } from '@deshartman/mcp-status-callback';

const callbackHandler = new CallbackHandler({ port: 4000 });

callbackHandler.on('callback', (data: CallbackEventData) => {
  const payload = data.message;
  // Process the strongly-typed payload
});

// Start the server - returns a Promise with the public URL
const startServer = async () => {
  try {
    // start() now returns the public URL directly
    const publicUrl = await callbackHandler.start('your-ngrok-auth-token');
    console.log(`Server started with callback URL: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error; // Re-throw if you want calling code to handle it
  }
};

startServer();
```

## API Reference

### `CallbackHandler`

The main class for handling callbacks.

#### Constructor

```typescript
new CallbackHandler(options?: CallbackHandlerOptions)
```

- `options.port` (optional): The port to run the Express server on (default: 4000). If the specified port is in use, the server will automatically try the next available port.

#### Methods

- `start(ngrokAuthToken: string, customDomain?: string): Promise<string>` - Starts the callback server and establishes an Ngrok tunnel. **Returns a Promise that resolves to the public callback URL**, which you can use directly in your API requests.
- `getPublicUrl(): string | null` - Returns the public Ngrok URL if available
- `stop(): Promise<void>` - Stops the callback server and closes the Ngrok tunnel

#### Events

- `'log'` - Emitted for general log messages
  - `level`: 'info' | 'warn' | 'error'
  - `message`: string | Error
- `'callback'` - Emitted when a callback is received
  - `level`: 'info'
  - `message`: any (the callback payload)
- `'tunnelStatus'` - Emitted when the tunnel status changes
  - `level`: 'info' | 'error'
  - `message`: string | Error

## Automatic Port Finding

The CallbackHandler automatically finds an available port if the specified port is in use. This means you don't have to worry about port conflicts when starting the server. If the default port (4000) or your specified port is already in use, the server will increment the port number and try again until it finds an available port.

## Custom Domains

Ngrok allows you to use custom domains with paid plans. This gives you a consistent URL for your callbacks, which is useful for:

- Configuring webhooks in third-party services without updating them each time you restart
- Sharing a stable URL with team members
- Testing with consistent URLs across development sessions
- Creating a more professional appearance for demos

To use a custom domain:

```javascript
// Option 1: Pass the custom domain directly and get the URL from the Promise
async function startWithCustomDomain() {
  try {
    const publicUrl = await callbackHandler.start(ngrokAuthToken, 'your-domain.ngrok.io');
    console.log(`Custom domain callback URL: ${publicUrl}`);
    // Use this URL in your API requests
  } catch (error) {
    console.error('Failed to start with custom domain:', error);
  }
}

// Option 2: Use environment variables
async function startWithOptionalCustomDomain() {
  const customDomain = process.env.NGROK_CUSTOM_DOMAIN;
  try {
    const publicUrl = await callbackHandler.start(
      ngrokAuthToken, 
      customDomain || undefined
    );
    console.log(`Callback URL: ${publicUrl}`);
    // Use this URL in your API requests
  } catch (error) {
    console.error('Failed to start callback handler:', error);
  }
}
```

Note: Custom domains require a paid Ngrok plan. See [ngrok.com/pricing](https://ngrok.com/pricing) for details.

## Example: Using with MCP Servers

This utility is particularly useful for MCP (Model Context Protocol) servers that need to receive callbacks from external services.

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallbackHandler } from '@deshartman/mcp-status-callback';

// Set up the callback handler
const callbackHandler = new CallbackHandler();

// Start the callback handler and get the URL directly from the Promise
async function setupCallbackHandler() {
  try {
    // start() now returns the public URL directly
    const callbackUrl = await callbackHandler.start('your-ngrok-auth-token');
    console.log(`Callback URL ready: ${callbackUrl}`);
    // Now you can use the callbackUrl in your MCP server tools
    // setupMcpServerWithCallback(callbackUrl);
    return callbackUrl;
  } catch (error) {
    console.error('Failed to start callback handler:', error);
    throw error;
  }
}

// You can also use the tunnelStatus event as before
callbackHandler.on('tunnelStatus', (data) => {
  if (data.level === 'info') {
    console.log(`Tunnel status update: ${data.message}`);
  }
});

// Use the callback URL in your MCP server tools
setupCallbackHandler().then(url => {
  // Use the URL in your MCP server configuration
});
```

## Publishing

This package is published with a scope. To publish updates:

```bash
# Build the package
npm run build

# Publish to npm (first time)
npm publish --access=public

# For subsequent updates
npm publish
```

## License

MIT
