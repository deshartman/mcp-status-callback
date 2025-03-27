import express from 'express';
import { EventEmitter } from 'events';
import ngrok from 'ngrok';

/**
 * Interface for CallbackHandler options
 */
export interface CallbackHandlerOptions {
    /**
     * Port to run the Express server on (default: 4000)
     */
    port?: number;
}

/**
 * Interface for log event data
 */
export interface LogEventData {
    level: 'info' | 'warn' | 'error';
    message: string | Error;
}

/**
 * Interface for callback event data
 */
export interface CallbackEventData {
    level: 'info';
    message: any;
}

/**
 * Interface for tunnel status event data
 */
export interface TunnelStatusEventData {
    level: 'info' | 'error';
    message: string | Error;
}

/**
 * Type definition for CallbackHandler events
 */
export interface CallbackHandlerEvents {
    log: (data: LogEventData) => void;
    callback: (data: CallbackEventData) => void;
    tunnelStatus: (data: TunnelStatusEventData) => void;
}

/**
 * CallbackHandler class
 * 
 * This utility establishes an Ngrok tunnel to a local Express server for API callbacks.
 * If you fire off an API request with a status callback URL, this utility can handle
 * the response to a localhost via an Ngrok tunnel and emit the result to a local listener.
 */
export class CallbackHandler extends EventEmitter {
    private app: express.Application;
    // private port: number;
    // private customDomain: string;
    // private ngrokAuthToken: string;
    private server: any;
    private ngrokUrl: string | null = null;

    /**
     * Creates a new CallbackHandler instance
     * 
     * @param options Configuration options
     */
    constructor(options: CallbackHandlerOptions = {}) {
        super();
        // this.port = options.port || 4000;
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
     * 
     * @param ngrokAuthToken Ngrok authentication token
     * @param port Port number to tunnel to
     * @param customDomain Optional custom domain to use with ngrok
     * @returns Promise that resolves to the callback URL
     */
    private async setupNgrokTunnel(ngrokAuthToken: string, port: number, customDomain?: string): Promise<string> {
        try {
            // Configure ngrok with auth token
            await ngrok.authtoken(ngrokAuthToken);

            // Configure ngrok options
            const ngrokOptions: any = {
                addr: port,
                authtoken: ngrokAuthToken
            };

            // Add custom domain if provided
            if (customDomain) {
                ngrokOptions.hostname = customDomain;
                this.emit('log', { level: 'info', message: `Using custom domain: ${customDomain}` });
            }

            // Start ngrok tunnel with the configured options
            this.ngrokUrl = await ngrok.connect(ngrokOptions);

            // Provide the public URL to the listener
            const callbackUrl = `${this.ngrokUrl}/callback`;
            this.emit('tunnelStatus', { level: 'info', message: callbackUrl });

            // Return the callback URL
            return callbackUrl;
        } catch (error) {
            // Emit the error event instead of using console.error
            this.emit('log', { level: 'error', message: `Failed to establish ngrok tunnel: ${error}` });
            // If there was a failure in setting up the tunnel, emit the event with the error
            this.emit('tunnelStatus', { level: 'error', message: error instanceof Error ? error : String(error) });
            throw error; // Re-throw the error so the caller can handle it
        }
    }

    /**
     * Starts the callback server.
     * Automatically finds an available port if the specified port is in use.
     * 
     * @param ngrokAuthToken Ngrok authentication token
     * @param customDomain Optional custom domain to use with ngrok
     * @returns Promise that resolves to the callback URL
     */
    async start(ngrokAuthToken: string, customDomain?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const startServer = (portToTry: number = 4000) => {
                const serverAttempt = this.app.listen(portToTry);

                serverAttempt.on('error', (error: NodeJS.ErrnoException) => {
                    if (error.code === 'EADDRINUSE') {
                        this.emit('log', { level: 'warn', message: `Port ${portToTry} in use, trying port ${portToTry + 1}` });
                        serverAttempt.close();
                        startServer(portToTry + 1);
                    } else {
                        this.emit('log', { level: 'error', message: `Start server Error: ${error}` });
                        reject(error);
                    }
                });

                serverAttempt.on('listening', async () => {
                    this.server = serverAttempt; // Store the successful server instance
                    this.emit('log', { level: 'info', message: `Callback server listening on port ${portToTry}` });

                    // Set up ngrok tunnel after server starts successfully
                    if (!ngrokAuthToken) {
                        const error = new Error('Ngrok auth token not provided');
                        this.emit('log', { level: 'error', message: error });
                        reject(error);
                        return;
                    }

                    try {
                        // Get the callback URL from setupNgrokTunnel
                        const callbackUrl = await this.setupNgrokTunnel(ngrokAuthToken, portToTry, customDomain);
                        resolve(callbackUrl);
                    } catch (error) {
                        reject(error);
                    }
                });
            };

            startServer();
        });
    }

    /**
     * Returns the public ngrok URL if available
     * 
     * @returns The public ngrok URL or null if not available
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

    /**
     * Type-safe event emitter methods
     */
    on<E extends keyof CallbackHandlerEvents>(
        event: E,
        listener: CallbackHandlerEvents[E]
    ): this {
        return super.on(event, listener as any);
    }

    once<E extends keyof CallbackHandlerEvents>(
        event: E,
        listener: CallbackHandlerEvents[E]
    ): this {
        return super.once(event, listener as any);
    }

    emit<E extends keyof CallbackHandlerEvents>(
        event: E,
        ...args: Parameters<CallbackHandlerEvents[E]>
    ): boolean {
        return super.emit(event, ...args);
    }
}
