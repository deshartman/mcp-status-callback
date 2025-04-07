# MCP Status Callback

A utility for handling API callbacks via Ngrok tunnels. Especially useful for MCP (Model Context Protocol) status callbacks.

This module creates a local Express server and establishes an Ngrok tunnel to it, allowing external services to send callbacks to your local development environment.

## New in Version 0.5.0: Official ngrok SDK

As of version 0.5.0, this package now uses the official ngrok JavaScript SDK (`@ngrok/ngrok`) instead of the community-maintained package. This provides several benefits:

- Official support from ngrok
- More robust and feature-rich API
- Better TypeScript integration
- Improved error handling
- Native support for TLS backends

The API remains backward compatible, so existing code should continue to work without changes.

## Installation

```bash
npm install @deshartman/mcp-status-callback
```

## Requirements

- Node.js 18 or higher
- An Ngrok account and auth token (get one at [ngrok.com](https://ngrok.com))

## Usage

### Basic Usage

```javascript
import { CallbackHandler } from '@deshartman/mcp-status-callback';

// Create a new instance with required options
const callbackHandler = new CallbackHandler({
  ngrokAuthToken: 'your-ngrok-auth-token',
  customDomain: 'your-custom-domain.ngrok.dev' // Optional
});

// Set up event listeners
callbackHandler.on('log', (data) => {
  console.log(`${data.level}: ${data.message}`);
});

callbackHandler.on('callback', (data) => {
  console.log('Received callback query parameters:', data.queryParameters);
  console.log('Received callback body:', data.body);
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

// Using async/await with try/catch
(async () => {
  try {
    // start() now returns the public URL directly
    const publicUrl = await callbackHandler.start();
    console.log(`Server started! Use this URL for callbacks: ${publicUrl}`);
    // You can now use this URL in your API requests
  } catch (error) {
    console.error('Failed to start callback handler:', error);
  }
})();

// Optional: Use a custom domain (requires Ngrok paid plan)
// async function startWithCustomDomain() {
//   try {
//     const callbackHandler = new CallbackHandler({
//       ngrokAuthToken: 'your-ngrok-auth-token',
//       customDomain: 'your-custom-domain.ngrok.dev'
//     });
//     const publicUrl = await callbackHandler.start();
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
import { CallbackHandler, CallbackEventData, CallbackHandlerOptions } from '@deshartman/mcp-status-callback';

// Define options with TypeScript type
const options: CallbackHandlerOptions = {
  ngrokAuthToken: 'your-ngrok-auth-token',
  customDomain: 'your-custom-domain.ngrok.dev' // Optional
};

const callbackHandler = new CallbackHandler(options);

callbackHandler.on('callback', (data: CallbackEventData) => {
  const queryParams = data.queryParameters;
  const payload = data.body;
  // Process the strongly-typed payload
});

// Start the server - returns a Promise with the public URL
const startServer = async () => {
  try {
    // start() now returns the public URL directly
    const publicUrl = await callbackHandler.start();
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
new CallbackHandler(options: CallbackHandlerOptions)
```

- `options.ngrokAuthToken` (required): Your Ngrok authentication token
- `options.customDomain` (optional): Custom domain for Ngrok tunnel (requires paid Ngrok plan)

#### Methods

- `start(): Promise<string>` - Starts the callback server and establishes an Ngrok tunnel. **Returns a Promise that resolves to the public callback URL**, which you can use directly in your API requests.
- `getPublicUrl(): string | null` - Returns the public Ngrok URL if available
- `stop(): Promise<void>` - Stops the callback server and closes the Ngrok tunnel

#### Events

- `'log'` - Emitted for general log messages
  - `level`: 'info' | 'warn' | 'error'
  - `message`: string | Error
- `'callback'` - Emitted when a callback is received
  - `level`: 'info'
  - `queryParameters`: any (the query parameters from the request)
  - `body`: any (the request body payload)
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
// Option 1: Pass the custom domain in the constructor
async function startWithCustomDomain() {
  try {
    const callbackHandler = new CallbackHandler({
      ngrokAuthToken: 'your-ngrok-auth-token',
      customDomain: 'your-domain.ngrok.dev'
    });
    const publicUrl = await callbackHandler.start();
    console.log(`Custom domain callback URL: ${publicUrl}`);
    // Use this URL in your API requests
  } catch (error) {
    console.error('Failed to start with custom domain:', error);
  }
}

// Option 2: Use environment variables
async function startWithOptionalCustomDomain() {
  const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
  const customDomain = process.env.NGROK_CUSTOM_DOMAIN;
  
  if (!ngrokAuthToken) {
    console.error('NGROK_AUTH_TOKEN environment variable is required');
    return;
  }
  
  try {
    const callbackHandler = new CallbackHandler({
      ngrokAuthToken,
      customDomain: customDomain || undefined
    });
    const publicUrl = await callbackHandler.start();
    console.log(`Callback URL: ${publicUrl}`);
    // Use this URL in your API requests
  } catch (error) {
    console.error('Failed to start callback handler:', error);
  }
}
```

Note: Custom domains require a paid Ngrok plan. See [ngrok.com/pricing](https://ngrok.com/pricing) for details.

## Automatic Content Type Conversion

The CallbackHandler automatically converts `application/x-www-form-urlencoded` request bodies to JSON objects. This is particularly useful when working with services like Twilio that send callbacks in URL-encoded format by default.

When a request with `Content-Type: application/x-www-form-urlencoded` is received:

1. The Express middleware parses the URL-encoded body
2. The CallbackHandler converts it to a proper JSON object
3. The converted JSON object is passed to your callback event handler
4. A log event is emitted indicating the conversion occurred

This means you can work with a consistent JSON format in your callback handlers regardless of how the data was originally sent, simplifying your code.

```javascript
callbackHandler.on('callback', (data) => {
  // data.body is always a JSON object, even if the original request
  // was sent as application/x-www-form-urlencoded
  console.log('Received callback data:', data.body);
  
  // Process the data as JSON
  if (data.body.status === 'completed') {
    // Handle completed status
  }
});
```

## Example: Using with MCP Servers

This utility is particularly useful for MCP (Model Context Protocol) servers that need to receive callbacks from external services.

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallbackHandler } from '@deshartman/mcp-status-callback';

// Set up the callback handler with required options
const callbackHandler = new CallbackHandler({
  ngrokAuthToken: 'your-ngrok-auth-token',
  customDomain: 'your-custom-domain.ngrok.dev' // Optional
});

// Start the callback handler and get the URL directly from the Promise
async function setupCallbackHandler() {
  try {
    // start() now returns the public URL directly
    const callbackUrl = await callbackHandler.start();
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
