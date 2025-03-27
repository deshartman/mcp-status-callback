import express from 'express';
import { EventEmitter } from 'events';
import ngrok from 'ngrok';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './src/.env' });

/**
 * Callback handler for Twilio payment callbacks
 * Extends EventEmitter to emit events that can be consumed by the main application
 */
class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private port: number;
    private server: any;
    private ngrokUrl: string | null = null;

    constructor(port: number = 4000) {
        super();
        this.port = port;
        this.app = express();

        // Configure Express
        this.app.use(express.json());

        // Add health check route
        this.app.get('/health', (_, res) => {
            res.send('good');
        });

        // Add callback POST endpoint
        this.app.post('/callback', (req, res) => {
            // Emit an event with the request body
            this.emit('callback', req.body);
            // Don't log here, we'll log in the event listener in index.ts

            // Send a success response
            res.status(200).send('Callback received');
        });
    }

    /**
     * Sets up an ngrok tunnel to expose the local server publicly
     * @param port The local port to expose
     */
    private async setupNgrokTunnel(port: number): Promise<void> {
        try {
            const ngrokAuthToken = process.env.NGROK_AUTH_TOKEN;
            if (!ngrokAuthToken) {
                throw new Error('NGROK_AUTH_TOKEN not found in environment variables');
            }

            this.emit('log', { level: 'info', message: `Setting up ngrok tunnel with auth token: ${ngrokAuthToken.substring(0, 5)}...` });

            // Configure ngrok with auth token
            await ngrok.authtoken(ngrokAuthToken);

            this.emit('log', { level: 'info', message: `Attempting to connect ngrok to port ${port}` });

            // Start ngrok tunnel pointing to the specified port with more options
            this.ngrokUrl = await ngrok.connect({
                addr: port,
                authtoken: ngrokAuthToken, // Explicitly provide the auth token here as well
                onStatusChange: (status) => {
                    this.emit('log', { level: 'info', message: `Ngrok status changed: ${status}` });
                },
                onLogEvent: (logEvent) => {
                    this.emit('log', { level: 'info', message: `Ngrok log: ${logEvent}` });
                }
            });

            this.emit('log', { level: 'info', message: `Ngrok tunnel established: ${this.ngrokUrl}` });
            this.emit('ngrokReady', this.ngrokUrl);

            // Confirm in logs that we're tunneling to the correct port
            this.emit('log', { level: 'info', message: `Ngrok is forwarding traffic from ${this.ngrokUrl} to http://localhost:${port}` });
        } catch (error) {
            this.emit('log', { level: 'error', message: `Failed to establish ngrok tunnel: ${error}` });
            this.emit('log', { level: 'info', message: 'Note: If you see ECONNREFUSED 127.0.0.1:4041, you may need to start ngrok manually first with "ngrok http 4000"' });

            // Try to provide more information about the error
            if (error instanceof Error) {
                this.emit('log', { level: 'error', message: `Error details: ${error.message}` });
                if (error.stack) {
                    this.emit('log', { level: 'error', message: `Stack trace: ${error.stack}` });
                }
            }
        }
    }

    /**
     * Starts the callback server.
     * Automatically finds an available port if the specified port is in use
     */
    start(): void {
        const startServer = (portToTry: number = this.port) => {
            const serverAttempt = this.app.listen(portToTry);

            serverAttempt.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    this.emit('log', { level: 'warn', message: `Port ${portToTry} in use, trying port ${portToTry + 1}` });
                    serverAttempt.close();
                    startServer(portToTry + 1);
                } else {
                    this.emit('error', error);
                    throw error;
                }
            });

            serverAttempt.on('listening', () => {
                this.port = portToTry; // Update the port to the one that worked
                this.server = serverAttempt; // Store the successful server instance
                this.emit('log', { level: 'info', message: `Callback server listening on port ${this.port}` });

                // Set up ngrok tunnel after server starts successfully
                this.setupNgrokTunnel(this.port)
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
