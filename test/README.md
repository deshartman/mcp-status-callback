# MCP Status Callback Test

This directory contains tests for the MCP Status Callback module using the local build.

## Requirements

- Node.js 18 or higher
- An Ngrok account and auth token (for the official @ngrok/ngrok SDK)

## Setup

The tests are configured to use the local build of the module by directly importing from `../build/index.js`. This approach ensures that the tests use the local version of the module without requiring any additional setup.

### Environment Variables

The tests use environment variables from a `.env` file for Ngrok authentication:

```
NGROK_AUTH_TOKEN=your_ngrok_auth_token
NGROK_CUSTOM_DOMAIN=your_custom_domain (optional)
```

These variables are loaded using the `dotenv` package.

## Running the Tests

The test directory includes npm scripts for convenient test execution:

```bash
# From the test directory
npm run test:js    # Run JavaScript test
npm run test:ts    # Run TypeScript test directly using tsx
npm run build      # Compile TypeScript to JavaScript
npm run test:build # Compile and run the compiled JavaScript
```

### Running the JavaScript Test

To run the JavaScript test:

```bash
# From the project root directory
node test/test.js

# Or if you're already in the test directory
node test.js
# Or use the npm script
npm run test:js
```

This test uses async/await syntax for better readability and error handling. It will:
1. Load environment variables from the .env file
2. Import the CallbackHandler from the local module
3. Create an instance of the CallbackHandler with the Ngrok auth token and optional custom domain
4. Set up event listeners
5. Start the handler
6. Create a tunnel and log the callback URL
7. Stop the handler after 10 seconds

### Running the TypeScript Test

To run the TypeScript test:

```bash
# From the project root directory
npx ts-node test/test.ts

# Or if you're already in the test directory
npx ts-node test.ts
# Or use tsx (faster alternative to ts-node)
npm run test:ts
```

The TypeScript test uses async/await syntax and performs the same steps as the JavaScript test but with TypeScript type safety. It includes proper TypeScript interfaces for the event data and demonstrates the updated API with the official @ngrok/ngrok SDK.

If you prefer to compile the TypeScript first:

```bash
# From the test directory
npm run build      # Compile TypeScript
npm run test:build # Compile and run in one step
# Or manually
npx tsc
node dist/test.js
```

## Expected Output

With a valid Ngrok auth token in the .env file, the test should successfully:
1. Import the module without errors
2. Create a CallbackHandler instance with the new options format
3. Start the callback handler using the official @ngrok/ngrok SDK
4. Create an Ngrok tunnel and receive the public URL directly from the start() method
5. Log the callback URL
6. Stop the handler after 10 seconds

If the Ngrok auth token is invalid or missing, you'll see an error message, but the test will still demonstrate that the module can be imported and instantiated correctly.

## Customizing the Test

You can modify the .env file to change the Ngrok authentication settings:

```
# Required: Your Ngrok authentication token
NGROK_AUTH_TOKEN=your_ngrok_auth_token

# Optional: Custom domain (requires Ngrok paid plan)
NGROK_CUSTOM_DOMAIN=your_custom_domain
```

The CallbackHandler constructor requires an options object with the Ngrok auth token for the official @ngrok/ngrok SDK:

```javascript
// Create a new instance with options
const callbackHandler = new CallbackHandler({
    ngrokAuthToken: process.env.NGROK_AUTH_TOKEN,
    customDomain: process.env.NGROK_CUSTOM_DOMAIN || undefined
});
```

### New in Version 0.5.0

The tests now demonstrate the updated API with the official @ngrok/ngrok SDK:

1. The start() method now returns the public URL directly:
   ```javascript
   const url = await callbackHandler.start();
   console.log(`Callback URL: ${url}`);
   ```

2. Event handling remains consistent with previous versions, but now works with the official SDK:
   ```javascript
   callbackHandler.on('tunnelStatus', (data) => {
       if (data.level === 'error') {
           console.error('Tunnel error:', data.message);
       } else {
           console.log(`Tunnel Status Callback URL: ${data.message}`);
       }
   });
   ```

You can also modify the test files to change the behavior, such as the timeout before stopping the handler:

```javascript
// In test.js or test.ts, change 10000 to a different value (in milliseconds)
setTimeout(async () => {
    await callbackHandler.stop();
    console.log('CallbackHandler stopped');
}, 10000); // 10 seconds
```
