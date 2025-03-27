# MCP Status Callback Handler

A simple utility for handling status callbacks during local development. This library dynamically creates an ngrok tunnel to a local Express server, allowing you to receive callbacks from external services without deploying your application. All events received are passed directly to your application for processing via event listeners.

It was originally developed to handle Model Context PRotocol (MCP) callbacks, thus the name, but can be used with any service that sends callbacks to a public URL.

## Features

- 🚀 **Dynamic Ngrok Tunnel Creation**: Automatically creates a public URL for your local server
- 🔄 **Transparent Callback Handling**: Passes callback data directly to your application
- 🧪 **Local Development with Public Updates**: Test webhooks and callbacks without deployment
- 🔍 **Port Auto-Discovery**: Automatically finds an available port if the specified one is in use

## Installation

```bash
npm install mcp-status-callback-handler
```

## Prerequisites

You need an ngrok auth token to use this library. You can get one by:

1. Sign up for a free account at [ngrok.com](https://ngrok.com)
2. Get your auth token from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)

## Setup

1. Create a `.env` file in your project's `src` directory with your ngrok auth token and Optional custome domain. Note: The custom domain is optional and can be left blank if you do not have one. It is just the base domain without the protocol (e.g., `mydomain.ngrok.dev`). 

```
NGROK_AUTH_TOKEN=your_ngrok_auth_token_here
NGROK_CUSTOM_DOMAIN=mydomain.ngrok.dev  # Optional
```

2. Import the callback handler in your application:

```typescript
import { callbackHandler } from "mcp-status-callback-handler";
```

3. Set up event listeners for the callback handler. There are three events:
- log: Logging from the lib. Provides the type of log ( 'info' | 'warn' | 'error' ) and the message.
- callback: When a callback is received, it is passed back to your application
- tunnelStatus: Provides status of the tunnel with "error" or "info" level.

```typescript
// Set up event listeners for callback handler logs
callbackHandler.on('log', (data) => {
  console.log(`Callback log: ${data.level}: ${data.message}`);
});

// Add event listener for callback events
callbackHandler.on('callback', (data) => {
  console.log(`Received callback: ${JSON.stringify(data.message)}`);
  // Process the callback data here
});

// Add event listener for tunnel status
callbackHandler.on('tunnelStatus', (data) => {
  if (data.level === 'error') {
    console.log(`Failed to establish tunnel: ${data.message}`);
  } else {
    console.log(`Tunnel established to URL: ${data.message}`);
    
    // Store the callback URL to use in your API requests
    const statusCallbackUrl = data.message;
    console.log(`Status Callback URL: ${statusCallbackUrl}`);
    
    // Now you can use this URL in your API calls
  }
});

// Get your environment variables
const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
const customDomain = process.env.NGROK_CUSTOM_DOMAIN; // Optional

// Check if the required auth token is available
if (!ngrokAuthToken) {
  console.error("NGROK_AUTH_TOKEN is required but not provided in environment variables");
  process.exit(1);
}

// Start the callback handler with the auth token and optional custom domain
callbackHandler.start(ngrokAuthToken, customDomain);
```

## Usage

Once the callback handler is started and the tunnel is established, you'll receive a public URL that you can use as the callback URL in your API requests.

## Sending Test Callbacks

You can test your callback handling by sending requests to your ngrok URL. Here are examples using curl:

### JSON Body Example

```bash
curl -X POST \
  https://abcd-123-456-789-0.ngrok.io/callback \
  -H 'Content-Type: application/json' \
  -d '{
    "CallSid": "CA123456789",
    "CallStatus": "completed",
    "CallDuration": "120",
    "Timestamp": "2023-04-01T12:00:00Z"
  }'
```

### Form-Encoded Example

```bash
curl -X POST \
  https://abcd-123-456-789-0.ngrok.io/callback \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'CallSid=CA123456789&CallStatus=completed&CallDuration=120&Timestamp=2023-04-01T12:00:00Z'
```

## API Reference

### Events

The callback handler emits the following events:

- **log**: General logging information
  ```typescript
  { level: 'info' | 'warn' | 'error', message: string }
  ```

- **callback**: When a callback is received
  ```typescript
  { level: 'info', message: object }
  ```

- **tunnelStatus**: When the tunnel status changes
  ```typescript
  { level: 'info' | 'error', message: string }
  ```

### Methods

- **start(ngrokAuthToken: string, customDomain?: string)**: Starts the callback server and sets up the ngrok tunnel
- **stop()**: Stops the server and closes the tunnel
- **getPublicUrl()**: Returns the current public ngrok URL

## Troubleshooting

- **Ngrok Auth Token Error**: Make sure you're providing a valid `ngrokAuthToken` to the `start()` method
- **Port Already in Use**: The library will automatically try the next port if the specified one is in use
- **Tunnel Connection Issues**: Check your internet connection and ngrok status at [status.ngrok.com](https://status.ngrok.com)

## License

MIT
