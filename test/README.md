# MCP Status Callback Test

This directory contains tests for the `@deshartman/mcp-status-callback` module using the local package installation.

## Requirements

- Node.js 18 or higher
- An Ngrok account and auth token (used by the `@deshartman/mcp-status-callback` module)
- Dependencies listed in `package.json`: `dotenv`, `tsx` (for running TypeScript tests directly)

## Setup

The tests are configured to use the local build of the module via a file dependency in `package.json`:

```json
"dependencies": {
    "@deshartman/mcp-status-callback": "file:../",
    "dotenv": "^16.4.7"
}
```

This ensures that the tests always use the current local version of the module.

### Environment Variables

The tests require environment variables defined in a `.env` file in the `test` directory for Ngrok authentication:

```dotenv
# Required: Your Ngrok authentication token
NGROK_AUTH_TOKEN=your_ngrok_auth_token

# Optional: Custom domain (requires Ngrok paid plan)
NGROK_CUSTOM_DOMAIN=your_custom_domain
```

These variables are loaded using the `dotenv` package within the test scripts.

## Running the Tests

The test directory includes npm scripts for convenient test execution:

```bash
# From the test directory
npm run test:js    # Run the JavaScript test (test.js) using Node
npm run test:ts    # Run the TypeScript test (test.ts) directly using tsx
npm run build      # Compile TypeScript (test.ts) to JavaScript (in dist/)
npm run test:build # Compile TypeScript and run the compiled JavaScript test
```

### Running the JavaScript Test (`test.js`)

To run the plain JavaScript test:

```bash
# From the project root directory
node test/test.js

# Or if you're already in the test directory
node test.js
# Or use the npm script
npm run test:js
```

This test performs the following steps:
1. Loads environment variables from the `.env` file.
2. Imports the `CallbackHandler` from the local module package.
3. Creates an instance of `CallbackHandler` using the `NGROK_AUTH_TOKEN` and optional `NGROK_CUSTOM_DOMAIN` from the environment variables.
4. Sets up event listeners for `log`, `callback`, and `tunnelStatus`.
5. Starts the handler using `await callbackHandler.start()`, which returns the public Ngrok URL.
6. Logs the received callback URL.
7. Stops the handler using `await callbackHandler.stop()` after a 10-second timeout.

### Running the TypeScript Test (`test.ts`)

To run the TypeScript test directly using `tsx` (a fast TypeScript executor):

```bash
# From the project root directory
npx tsx test/test.ts

# Or if you're already in the test directory
npx tsx test.ts
# Or use the npm script
npm run test:ts
```

The TypeScript test (`test.ts`) performs the same steps as the JavaScript test but includes:
- TypeScript type safety.
- Imports for `CallbackHandler`, `CallbackHandlerEventNames`, and specific event data types (`LogEventData`, `CallbackEventData`, `TunnelStatusEventData`).
- Event listeners defined using `CallbackHandlerEventNames` constants and typed event data parameters.

Alternatively, you can compile the TypeScript code first and then run the compiled JavaScript:

```bash
# From the test directory
npm run build      # Compile TypeScript to ./dist/test.js
node dist/test.js  # Run the compiled JavaScript

# Or compile and run in one step
npm run test:build
```

## Expected Output

With a valid `NGROK_AUTH_TOKEN` in the `.env` file, both `test.js` and `test.ts` should successfully:
1. Import the module without errors.
2. Create a `CallbackHandler` instance.
3. Log status messages, including whether the auth token and custom domain were found.
4. Start the callback handler and Ngrok tunnel.
5. Log the public callback URL received from the `start()` method.
6. Log any received callback requests or tunnel status updates via the event listeners.
7. Stop the handler cleanly after the timeout.
8. Log "CallbackHandler stopped".

If the `NGROK_AUTH_TOKEN` is invalid or missing, the test will log an error message and exit gracefully after attempting to create the handler instance, demonstrating that the module can still be imported.

## Customizing the Test

### Environment Variables

Modify the `test/.env` file to change Ngrok settings:

```dotenv
# Required: Your Ngrok authentication token
NGROK_AUTH_TOKEN=your_ngrok_auth_token

# Optional: Custom domain (requires Ngrok paid plan)
NGROK_CUSTOM_DOMAIN=your_custom_domain
```

### Test Logic

The `CallbackHandler` constructor requires an options object:

```typescript
// In test.ts
import { CallbackHandler, CallbackHandlerEventNames, LogEventData, CallbackEventData, TunnelStatusEventData } from '@deshartman/mcp-status-callback';

const callbackHandler = new CallbackHandler({
    ngrokAuthToken: process.env.NGROK_AUTH_TOKEN!, // Non-null assertion used after check
    customDomain: process.env.NGROK_CUSTOM_DOMAIN || undefined
});

// Event handling using constants and types
callbackHandler.on(CallbackHandlerEventNames.LOG, (data: LogEventData) => {
    console.log(`[${data.level.toUpperCase()}] ${data.message}`);
});

callbackHandler.on(CallbackHandlerEventNames.CALLBACK, (data: CallbackEventData) => {
    console.log('Received callback query parameters:', data.queryParameters);
    console.log('Received callback body:', data.body);
});

callbackHandler.on(CallbackHandlerEventNames.TUNNEL_STATUS, (data: TunnelStatusEventData) => {
    if (data.level === 'error') {
        console.error('Tunnel error:', data.message);
    } else {
        console.log(`Tunnel Status Callback URL: ${data.message}`);
    }
});

// Starting the handler
const url = await callbackHandler.start();
console.log(`Callback URL: ${url}`);

// Stopping the handler (adjust timeout as needed)
setTimeout(async () => {
    await callbackHandler.stop();
    console.log('CallbackHandler stopped');
}, 10000); // 10 seconds
```

You can modify the test files (`test.js` or `test.ts`) to change behavior, such as the timeout duration before stopping the handler.
