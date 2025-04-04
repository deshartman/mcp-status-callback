import express from 'express';
import { EventEmitter } from 'events';
import ngrok from 'ngrok';

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
    queryParameters: any;
    body: any; // For the request body
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
 * Interface for CallbackHandler constructor options
 */
export interface CallbackHandlerOptions {
    ngrokAuthToken: string;
    customDomain?: string;
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
    private server: any;
    private ngrokUrl: string | null = null;
    private ngrokAuthToken: string;
    private customDomain?: string;

    /**
     * Creates a new CallbackHandler instance
     *
     * @param options Configuration options
     */
    constructor(options: CallbackHandlerOptions) {
        super();
        this.ngrokAuthToken = options.ngrokAuthToken;
        this.customDomain = options.customDomain;
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
            // Extract query parameters using req.query
            const queryParameters = req.query; // Use the object directly as parsed by Express

            // Process the body based on content type
            let body = req.body;

            // Check if the request is URL-encoded (Twilio's default format)
            const contentType = req.get('Content-Type') || '';
            if (contentType.includes('application/x-www-form-urlencoded')) {
                this.emit('log', { level: 'info', message: `application/x-www-form-urlencoded received, so converting to JSON` });
                // Body is already parsed by express.urlencoded middleware
                // But we want to ensure it's treated as a proper JSON object
                body = { ...body };
            }
            // If it's already JSON, express.json middleware has parsed it and we can use it as is

            // Emit an event with the query parameters object and the processed body
            this.emit('callback', { level: 'info', queryParameters: queryParameters, body: body });

            // Send a success response
            res.status(200).send('Callback received');
        });
    }

    /**
     * Sets up an ngrok tunnel to expose the local server publicly
     * 
     * @param port Port number to tunnel to
     * @returns Promise that resolves to the callback URL
         */
    private async setupNgrokTunnel(port: number): Promise<string> {
        try {
            // Configure ngrok with auth token
            await ngrok.authtoken(this.ngrokAuthToken);

            // Configure ngrok options
            const ngrokOptions: any = {
                addr: port,
                authtoken: this.ngrokAuthToken
            };

            // Add custom domain if provided
            if (this.customDomain) {
                ngrokOptions.hostname = this.customDomain;
                this.emit('log', { level: 'info', message: `Using custom domain: ${this.customDomain}` });
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
     * @returns Promise that resolves to the callback URL
     */
    async start(): Promise<string> {
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
                    if (!this.ngrokAuthToken) {
                        const error = new Error('Ngrok auth token not provided');
                        this.emit('log', { level: 'error', message: error });
                        reject(error);
                        return;
                    }

                    try {
                        // Get the callback URL from setupNgrokTunnel
                        const callbackUrl = await this.setupNgrokTunnel(portToTry);
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
            await ngrok.disconnect(this.ngrokUrl);
        }
        this.emit('log', { level: 'info', message: 'Ngrok tunnel closed' });

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
