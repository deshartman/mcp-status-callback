# MCP Status Callback

A utility for handling API callbacks via Ngrok tunnels. Especially useful for MCP (Model Context Protocol) status callbacks.

This module creates a local Express server and establishes an Ngrok tunnel to it, allowing external services to send callbacks to your local development environment.

## Installation

```bash
npm install mcp-status-callback
```

## Requirements

- Node.js 14 or higher
- An Ngrok account and auth token (get one at [ngrok.com](https://ngrok.com))

## Usage

### Basic Usage

```javascript
import { CallbackHandler } from 'mcp-status-callback';

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
const ngrokAuthToken = 'your-ngrok-auth-token';
callbackHandler.start(ngrokAuthToken);

// Optional: Use a custom domain (requires Ngrok paid plan)
// callbackHandler.start(ngrokAuthToken, 'your-custom-domain.ngrok.io');

// When you're done, stop the server
// await callbackHandler.stop();
```

### TypeScript Usage

```typescript
import { CallbackHandler, CallbackEventData } from 'mcp-status-callback';

const callbackHandler = new CallbackHandler({ port: 4000 });

callbackHandler.on('callback', (data: CallbackEventData) => {
  const payload = data.message;
  // Process the strongly-typed payload
});

// Start the server
callbackHandler.start('your-ngrok-auth-token');
```

## API Reference

### `CallbackHandler`

The main class for handling callbacks.

#### Constructor

```typescript
new CallbackHandler(options?: CallbackHandlerOptions)
```

- `options.port` (optional): The port to run the Express server on (default: 4000)

#### Methods

- `start(ngrokAuthToken: string, customDomain?: string): void` - Starts the callback server and establishes an Ngrok tunnel
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

## Example: Using with MCP Servers

This utility is particularly useful for MCP (Model Context Protocol) servers that need to receive callbacks from external services.

```javascript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallbackHandler } from 'mcp-status-callback';

// Set up the callback handler
const callbackHandler = new CallbackHandler();
let callbackUrl = '';

callbackHandler.on('tunnelStatus', (data) => {
  if (data.level === 'info') {
    callbackUrl = data.message;
    console.log(`Callback URL ready: ${callbackUrl}`);
  }
});

// Start the callback handler
callbackHandler.start('your-ngrok-auth-token');

// Use the callback URL in your MCP server tools
// ...
```

## License

MIT
