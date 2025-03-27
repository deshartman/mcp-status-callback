import express from 'express';
import { EventEmitter } from 'events';
import ngrok from 'ngrok';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './src/.env' });

/**
 * This is a general utility that establishes an Ngrok tunnel to a local Express server for API callbacks. The intention is that if you fire off an API request with a status callback URL,
 * then this utility can handle the response to a localhost via an Ngrok tunnel setup and emit the result to a local listener.
 * 
 * NOTE: I am purposely not using console.log in this lib, as it is going to be used with MCP Servers using Stdio for logging.
 * 
 */
class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private port: number;
    private customDomain: string;
    private ngrokAuthToken: string;
    private server: any;
    private ngrokUrl: string | null = null;

    constructor(port: number = 4000) {
        super();
        this.port = port;
        this.customDomain = "";
        this.ngrokAuthToken = "";
        this.app = express();

        // Configure Express
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));


        // Add health check route
        this.app.get('/', (_, res) => {
            res.send('POST status callbacks to /callback');
        });

        // This is the main status callback endpoint. It will pass the request body to whoever is listening
        this.app.post('/callback', (req, res) => {
            // Emit an event with the request body
            this.emit('callback', { level: 'info', message: req.body });
            // Send a success response
            res.status(200).send('Callback received');
        });
    }

    /**
     * Sets up an ngrok tunnel to expose the local server publicly
     * @param port The local port to expose
     * @param customDomain Optional custom domain to use with ngrok
     */
    private async setupNgrokTunnel(): Promise<void> {
        try {
            if (!this.ngrokAuthToken) {
                throw new Error('NGROK_AUTH_TOKEN not found in environment variables');
            }

            // Configure ngrok with auth token
            await ngrok.authtoken(this.ngrokAuthToken);

            // Configure ngrok options
            const ngrokOptions: any = {
                addr: this.port,
                authtoken: this.ngrokAuthToken
            };

            // Add custom domain if provided
            if (this.customDomain) {
                ngrokOptions.hostname = this.customDomain;
                this.emit('log', { level: 'info', message: `Using custom domain: ${this.customDomain}` });
            }

            // Start ngrok tunnel with the configured options
            this.ngrokUrl = await ngrok.connect(ngrokOptions);

            // Provide the boolean status and public URL if ready: true, to the listener
            this.emit('tunnelStatus', { level: 'info', message: `${this.ngrokUrl}/callback` });
        } catch (error) {
            console.error(`Failed to establish ngrok tunnel: ${error}`);
            // If there was a failure in setting up the tunnel, emit the event with an empty URL
            this.emit('tunnelStatus', { level: 'error', message: error });
        }
    }

    /**
     * Starts the callback server.
     * Automatically finds an available port if the specified port is in use
     * @param customDomain Optional custom domain to use with ngrok
     */
    start(ngrokAuthToken: string, customDomain?: string): void {
        const startServer = (portToTry: number = this.port) => {
            const serverAttempt = this.app.listen(portToTry);

            serverAttempt.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    this.emit('log', { level: 'warn', message: `Port ${portToTry} in use, trying port ${portToTry + 1}` });
                    serverAttempt.close();
                    startServer(portToTry + 1);
                } else {
                    this.emit('log', { level: 'error', message: `Start server Error: ${error}` });
                    throw error;
                }
            });

            serverAttempt.on('listening', () => {
                this.port = portToTry; // Update the port to the one that worked
                this.ngrokAuthToken = ngrokAuthToken;
                this.customDomain = customDomain || '';

                this.server = serverAttempt; // Store the successful server instance
                this.emit('log', { level: 'info', message: `Callback server listening on port ${this.port}` });

                // Set up ngrok tunnel after server starts successfully
                this.setupNgrokTunnel()
                    .catch(error => {
                        this.emit('log', { level: 'error', message: `Error setting up ngrok: ${error}` });
                    });
            });
        };

        startServer();
    }


    /**
     * Returns the public ngrok URL if available
     */
    getPublicUrl(): string | null {
        return this.ngrokUrl;
    }

    /**
     * Stops the callback server and closes the ngrok tunnel
     */
    async stop(): Promise<void> {
        // Close ngrok tunnel if it exists
        if (this.ngrokUrl) {
            await ngrok.kill();
            this.emit('log', { level: 'info', message: 'Ngrok tunnel closed' });
        }

        // Close server if it exists
        if (this.server) {
            this.server.close();
            this.emit('log', { level: 'info', message: 'Callback server stopped' });
        }
    }

}

// Export a singleton instance
export const callbackHandler = new CallbackHandler();
