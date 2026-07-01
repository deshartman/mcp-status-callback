import express from 'express';
import * as ngrok from '@ngrok/ngrok';
import type { Server } from 'node:http';

/**
 * Structural logger interface. Anyone can pass `console`, pino, winston, or a
 * custom object whose methods match this shape.
 */
export interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string | Error): void;
}

/**
 * Payload delivered to the consumer's `onCallback` handler for every request
 * to `POST /callback`. `body` is always a plain JSON object regardless of the
 * incoming Content-Type (form-encoded bodies are coerced).
 */
export interface CallbackData {
    queryParameters: Record<string, unknown>;
    body: unknown;
}

export interface CallbackHandlerOptions {
    ngrokAuthToken: string;
    customDomain?: string;
    onCallback: (data: CallbackData) => void | Promise<void>;
    logger?: Logger;
}

const NOOP_LOGGER: Logger = {
    info() {},
    warn() {},
    error() {},
};

/**
 * CallbackHandler
 *
 * Starts an Express server on an available port (auto-retries `port + 1` on
 * EADDRINUSE), fronts it with an ngrok tunnel, and forwards `POST /callback`
 * requests to the injected `onCallback`. Diagnostics go to the injected
 * `logger` (defaults to a no-op logger).
 *
 * @example
 * const handler = new CallbackHandler({
 *   ngrokAuthToken: process.env.NGROK_AUTH_TOKEN!,
 *   onCallback: async ({ queryParameters, body }) => {
 *     // handle callback
 *   },
 *   logger: console,
 * });
 *
 * const url = await handler.start();
 * // ...
 * await handler.stop();
 */
export class CallbackHandler {
    private app: express.Application;
    private server: Server | null = null;
    private ngrokListener: ngrok.Listener | null = null;
    private ngrokUrl: string | null = null;
    private ngrokAuthToken: string;
    private customDomain?: string;
    private readonly onCallback: (data: CallbackData) => void | Promise<void>;
    private readonly logger: Logger;

    constructor(options: CallbackHandlerOptions) {
        if (!options.ngrokAuthToken) {
            throw new Error('CallbackHandler: ngrokAuthToken is required');
        }
        if (typeof options.onCallback !== 'function') {
            throw new Error('CallbackHandler: onCallback is required and must be a function');
        }

        this.ngrokAuthToken = options.ngrokAuthToken;
        this.customDomain = options.customDomain;
        this.onCallback = options.onCallback;
        this.logger = options.logger ?? NOOP_LOGGER;

        this.app = express();
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        this.app.get('/', (_, res) => {
            res.send('POST status callbacks to /callback');
        });

        this.app.post('/callback', async (req, res) => {
            const queryParameters = req.query as Record<string, unknown>;

            let body: unknown = req.body;

            const contentType = req.get('Content-Type') || '';
            if (contentType.includes('application/x-www-form-urlencoded')) {
                this.logger.info('application/x-www-form-urlencoded received, so converting to JSON');
                body = { ...(req.body as Record<string, unknown>) };
            }

            try {
                await this.onCallback({ queryParameters, body });
            } catch (error) {
                this.logger.error(error instanceof Error ? error : String(error));
                res.status(500).send('Callback handler error');
                return;
            }

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
                        this.logger.warn(`Port ${portToTry} in use, trying port ${portToTry + 1}`);
                        serverAttempt.close();
                        startServer(portToTry + 1);
                    } else {
                        this.logger.error(`Start server Error: ${error}`);
                        reject(error);
                    }
                });

                serverAttempt.on('listening', async () => {
                    this.server = serverAttempt;
                    this.logger.info(`Callback server listening on port ${portToTry}`);

                    try {
                        this.ngrokListener = await ngrok.forward({
                            addr: portToTry,
                            authtoken: this.ngrokAuthToken,
                            domain: this.customDomain,
                            onStatusChange: (status: string) => {
                                if (status.includes('error') || status.includes('disconnected')) {
                                    this.logger.error(`Tunnel status changed: ${status}`);
                                }
                            },
                        });

                        this.ngrokUrl = this.ngrokListener.url();
                        const callbackUrl = `${this.ngrokUrl}/callback`;

                        if (this.customDomain) {
                            this.logger.info(`Using custom domain: ${this.customDomain}`);
                        }

                        resolve(callbackUrl);
                    } catch (error) {
                        this.logger.error(`Failed to establish ngrok tunnel: ${error}`);
                        reject(error);
                    }
                });
            };

            startServer();
        });
    }

    /**
     * Returns the public ngrok URL if available.
     */
    getPublicUrl(): string | null {
        return this.ngrokUrl;
    }

    /**
     * Stops the callback server and closes all ngrok tunnels.
     */
    async stop(): Promise<void> {
        try {
            if (this.ngrokListener) {
                await this.ngrokListener.close();
                this.logger.info('Ngrok tunnel closed');
                this.ngrokListener = null;
                this.ngrokUrl = null;
            } else {
                if (this.ngrokUrl) {
                    await ngrok.disconnect(this.ngrokUrl);
                    this.logger.info(`Disconnected tunnel: ${this.ngrokUrl}`);
                    this.ngrokUrl = null;
                }
                await ngrok.disconnect();
                this.logger.info('All ngrok tunnels closed');
            }
        } catch (error) {
            this.logger.error(`Error during tunnel cleanup: ${error}`);
        }

        if (this.server) {
            this.server.close();
            this.logger.info('Callback server stopped');
        }
    }
}
