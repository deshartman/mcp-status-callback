import express from 'express';
import { EventEmitter } from 'events';
import * as ngrok from '@ngrok/ngrok';

/**
 * Defines constants for the event names emitted by CallbackHandler.
 * Using these constants provides type safety and prevents typos.
 *
 * @example
 * import { CallbackHandler, CallbackHandlerEventNames } from './CallbackHandler';
 * const handler = new CallbackHandler({ ngrokAuthToken: 'token' });
 * handler.on(CallbackHandlerEventNames.LOG, (data) => console.log(data.message));
 * handler.on(CallbackHandlerEventNames.CALLBACK, (data) => console.log(data.body));
 * handler.on(CallbackHandlerEventNames.TUNNEL_STATUS, (data) => console.log(data.message));
 */
export const CallbackHandlerEventNames = {
    /** Emitted for general log messages */
    LOG: 'log',
    /** Emitted when a callback is received on the /callback endpoint */
    CALLBACK: 'callback',
    /** Emitted when the Ngrok tunnel status changes (e.g., connection established, error) */
    TUNNEL_STATUS: 'tunnelStatus',
} as const;

/**
 * Interface for log event data emitted by the 'log' event.
 * @see {@link CallbackHandlerEventNames.LOG}
 */
export interface LogEventData {
    level: 'info' | 'warn' | 'error';
    message: string | Error;
}

/**
 * Interface for callback event data emitted by the 'callback' event.
 * @see {@link CallbackHandlerEventNames.CALLBACK}
 */
export interface CallbackEventData {
    level: 'info';
    queryParameters: any;
    body: any; // For the request body
}

/**
 * Interface for tunnel status event data emitted by the 'tunnelStatus' event.
 * @see {@link CallbackHandlerEventNames.TUNNEL_STATUS}
 */
export interface TunnelStatusEventData {
    level: 'info' | 'error';
    message: string | Error;
}

/**
 * Defines the events emitted by the {@link CallbackHandler} class.
 * Use {@link CallbackHandlerEventNames} constants for event names.
 */
export interface CallbackHandlerEvents {
    /**
     * Emitted for logging purposes (info, warnings, errors).
     * @param data - The log event data.
     * @see {@link LogEventData}
     * @see {@link CallbackHandlerEventNames.LOG}
     */
    [CallbackHandlerEventNames.LOG]: (data: LogEventData) => void;
    /**
     * Emitted when a request is received on the /callback endpoint.
     * @param data - The callback event data, containing query parameters and body.
     * @see {@link CallbackEventData}
     * @see {@link CallbackHandlerEventNames.CALLBACK}
     */
    [CallbackHandlerEventNames.CALLBACK]: (data: CallbackEventData) => void;
    /**
     * Emitted when the Ngrok tunnel status changes or provides the initial URL.
     * @param data - The tunnel status event data.
     * @see {@link TunnelStatusEventData}
     * @see {@link CallbackHandlerEventNames.TUNNEL_STATUS}
     */
    [CallbackHandlerEventNames.TUNNEL_STATUS]: (data: TunnelStatusEventData) => void;
}

/**
 * Interface for {@link CallbackHandler} constructor options.
 */
export interface CallbackHandlerOptions {
    ngrokAuthToken: string;
    customDomain?: string;
}

/**
 * CallbackHandler Class
 *
 * Establishes an Ngrok tunnel to a local Express server for handling API status callbacks,
 * particularly useful in development environments or for MCP (Model Context Protocol) servers.
 * It automatically finds an available port, starts an Express server, connects it via Ngrok,
 * and emits events for logs, received callbacks, and tunnel status changes.
 *
 * Use {@link CallbackHandlerEventNames} constants when subscribing to events.
 *
 * @example
 * import { CallbackHandler, CallbackHandlerEventNames, CallbackHandlerOptions } from './CallbackHandler';
 *
 * const options: CallbackHandlerOptions = { ngrokAuthToken: 'YOUR_NGROK_TOKEN' };
 * const handler = new CallbackHandler(options);
 *
 * handler.on(CallbackHandlerEventNames.LOG, (data) => console.log(`[${data.level}] ${data.message}`));
 * handler.on(CallbackHandlerEventNames.CALLBACK, (data) => {
 *   console.log('Received callback:', data.body);
 * });
 * handler.on(CallbackHandlerEventNames.TUNNEL_STATUS, (data) => {
 *   if (data.level === 'info') console.log('Callback URL:', data.message);
 *   else console.error('Tunnel Error:', data.message);
 * });
 *
 * async function start() {
 *   try {
 *     const url = await handler.start();
 *     console.log(`Handler started. Callback URL: ${url}`);
 *     // Use 'url' in your API calls
 *   } catch (error) {
 *     console.error('Failed to start handler:', error);
 *   }
 * }
 *
 * start();
 *
 * // To stop: await handler.stop();
 *
 * @extends EventEmitter
 */
export class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private server: any;
    private ngrokListener: ngrok.Listener | null = null;
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
            // Use the constant for consistency, although the string literal works here too
            this.emit(CallbackHandlerEventNames.CALLBACK, { level: 'info', queryParameters: queryParameters, body: body });

            // Send a success response
            res.status(200).send('Callback received');
        });
    }

    /**
     * Starts the callback server.
     * Automatically finds an available port if the specified port is in use.
     * 
     * @returns Promise that resolves to the callback URL
     */
    async start(): Promise<string> {
        return new Promise((resolve, reject) => {
            const startServer = async (portToTry: number = 4000) => {
                const serverAttempt = this.app.listen(portToTry);

                serverAttempt.on('error', (error: NodeJS.ErrnoException) => {
                    if (error.code === 'EADDRINUSE') {
                        this.emit(CallbackHandlerEventNames.LOG, { level: 'warn', message: `Port ${portToTry} in use, trying port ${portToTry + 1}` });
                        serverAttempt.close();
                        startServer(portToTry + 1);
                    } else {
                        this.emit(CallbackHandlerEventNames.LOG, { level: 'error', message: `Start server Error: ${error}` });
                        reject(error);
                    }
                });

                serverAttempt.on('listening', async () => {
                    this.server = serverAttempt; // Store the successful server instance
                    this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: `Callback server listening on port ${portToTry}` });

                    if (!this.ngrokAuthToken) {
                        const error = new Error('Ngrok auth token not provided');
                        this.emit(CallbackHandlerEventNames.LOG, { level: 'error', message: error });
                        reject(error);
                        return;
                    }

                    try {
                        // Use the official SDK to establish the tunnel
                        this.ngrokListener = await ngrok.forward({
                            addr: portToTry,
                            authtoken: this.ngrokAuthToken,
                            domain: this.customDomain,
                            // Optional status change handler
                            onStatusChange: (status: string) => {
                                // Status will contain error information if there's a problem
                                if (status.includes('error') || status.includes('disconnected')) {
                                    this.emit(CallbackHandlerEventNames.LOG, {
                                        level: 'error',
                                        message: `Tunnel status changed: ${status}`
                                    });
                                }
                            }
                        });

                        this.ngrokUrl = this.ngrokListener.url();
                        const callbackUrl = `${this.ngrokUrl}/callback`;

                        if (this.customDomain) {
                            this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: `Using custom domain: ${this.customDomain}` });
                        }

                        this.emit(CallbackHandlerEventNames.TUNNEL_STATUS, {
                            level: 'info',
                            message: callbackUrl
                        });

                        resolve(callbackUrl);
                    } catch (error) {
                        this.emit(CallbackHandlerEventNames.LOG, {
                            level: 'error',
                            message: `Failed to establish ngrok tunnel: ${error}`
                        });

                        this.emit(CallbackHandlerEventNames.TUNNEL_STATUS, {
                            level: 'error',
                            message: error instanceof Error ? error : String(error)
                        });

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
     * Stops the callback server and closes all ngrok tunnels
     */
    async stop(): Promise<void> {
        try {
            // Close the ngrok listener if it exists
            if (this.ngrokListener) {
                await this.ngrokListener.close();
                this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: 'Ngrok tunnel closed' });
                this.ngrokListener = null;
                this.ngrokUrl = null;
            } else {
                // If for some reason we don't have a listener reference but have a URL,
                // try to disconnect using the URL
                if (this.ngrokUrl) {
                    await ngrok.disconnect(this.ngrokUrl);
                    this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: `Disconnected tunnel: ${this.ngrokUrl}` });
                    this.ngrokUrl = null;
                }

                // As a fallback, disconnect all tunnels
                await ngrok.disconnect();
                this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: 'All ngrok tunnels closed' });
            }
        } catch (error) {
            this.emit(CallbackHandlerEventNames.LOG, { level: 'error', message: `Error during tunnel cleanup: ${error}` });
        }

        // Close server if it exists
        if (this.server) {
            this.server.close();
            this.emit(CallbackHandlerEventNames.LOG, { level: 'info', message: 'Callback server stopped' });
        }
    }

    // --- Type-safe EventEmitter Overrides ---

    /**
     * Adds the `listener` function to the end of the listeners array for the
     * event named `event`. No checks are made to see if the `listener` has
     * already been added. Multiple calls passing the same combination of `event`
     * and `listener` will result in the `listener` being added, and called, multiple
     * times.
     *
     * Use {@link CallbackHandlerEventNames} constants for the `event` parameter.
     *
     * @param event The name of the event. Use {@link CallbackHandlerEventNames}.
     * @param listener The callback function
     * @returns A reference to the CallbackHandler, so that calls can be chained.
     */
    on<E extends keyof CallbackHandlerEvents>(
        event: E,
        listener: CallbackHandlerEvents[E]
    ): this {
        // The `as any` cast is necessary because TypeScript struggles to reconcile
        // the generic E with the specific keys of CallbackHandlerEvents within the super call.
        // However, the method signature ensures type safety for the caller.
        return super.on(event, listener as any);
    }

    /**
     * Adds a **one-time** `listener` function for the event named `event`. The
     * next time `event` is triggered, this listener is removed and then called.
     *
     * Use {@link CallbackHandlerEventNames} constants for the `event` parameter.
     *
     * @param event The name of the event. Use {@link CallbackHandlerEventNames}.
     * @param listener The callback function
     * @returns A reference to the CallbackHandler, so that calls can be chained.
     */
    once<E extends keyof CallbackHandlerEvents>(
        event: E,
        listener: CallbackHandlerEvents[E]
    ): this {
        return super.once(event, listener as any);
    }

    /**
     * Synchronously calls each of the listeners registered for the event named `event`,
     * in the order they were registered, passing the supplied arguments to each.
     *
     * Use {@link CallbackHandlerEventNames} constants for the `event` parameter.
     *
     * @param event The name of the event. Use {@link CallbackHandlerEventNames}.
     * @param args Arguments to pass to the listeners. See {@link CallbackHandlerEvents}.
     * @returns `true` if the event had listeners, `false` otherwise.
     */
    emit<E extends keyof CallbackHandlerEvents>(
        event: E,
        ...args: Parameters<CallbackHandlerEvents[E]>
    ): boolean {
        return super.emit(event, ...args);
    }
}
