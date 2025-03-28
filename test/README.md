# MCP Status Callback Test

This directory contains tests for the MCP Status Callback module using the local build.

## Setup

The tests are configured to use the local build of the module by directly importing from `../build/index.js`. This approach ensures that the tests use the local version of the module without requiring any additional setup.

### Environment Variables

The tests use environment variables from a `.env` file for Ngrok authentication:

```
NGROK_AUTH_TOKEN=your_ngrok_auth_token
NGROK_CUSTOM_DOMAIN=your_custom_domain (optional)
```

These variables are loaded using the `dotenv` package.

## Running the JavaScript Test

To run the JavaScript test:

```bash
# From the project root directory
node test/test.js

# Or if you're already in the test directory
node test.js
```

This test uses async/await syntax for better readability and error handling. It will:
1. Load environment variables from the .env file
2. Import the CallbackHandler from the local module
3. Create an instance of the CallbackHandler with the Ngrok auth token and optional custom domain
4. Set up event listeners
5. Start the handler
6. Create a tunnel and log the callback URL
7. Stop the handler after 10 seconds

## Running the TypeScript Test

To run the TypeScript test:

```bash
# From the project root directory
npx ts-node test/test.ts

# Or if you're already in the test directory
npx ts-node test.ts
```

The TypeScript test also uses async/await syntax and performs the same steps as the JavaScript test but with TypeScript type safety.

If you prefer to compile the TypeScript first:

```bash
# From the test directory
npx tsc
node dist/test.js
```

## Expected Output

With a valid Ngrok auth token in the .env file, the test should successfully:
1. Import the module without errors
2. Create a CallbackHandler instance
3. Start the callback handler
4. Create an Ngrok tunnel
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

The CallbackHandler constructor now requires an options object with the Ngrok auth token:

```javascript
// Create a new instance with options
const callbackHandler = new CallbackHandler({
    ngrokAuthToken: process.env.NGROK_AUTH_TOKEN,
    customDomain: process.env.NGROK_CUSTOM_DOMAIN || undefined
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
