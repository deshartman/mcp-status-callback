import express from 'express';
import { EventEmitter } from 'events';

/**
 * Callback handler for Twilio payment callbacks
 * Extends EventEmitter to emit events that can be consumed by the main application
 */
class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private port: number;
    private server: any;

    constructor(port: number = 4000) {
        super();
        this.port = port;
        this.app = express();

        // Configure Express
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Set up routes
        this.setupRoutes();
    }

    /**
     * Starts the callback server
     */
    start(): void {
        this.server = this.app.listen(this.port, () => {
            this.emit('log', { level: 'info', message: `Callback server listening on port ${this.port}` });
        });
    }

    /**
     * Stops the callback server
     */
    stop(): void {
        if (this.server) {
            this.server.close();
            this.emit('log', { level: 'info', message: 'Callback server stopped' });
        }
    }

    /**
     * Sets up the Express routes
     */
    private setupRoutes(): void {
        // Main callback endpoint
        this.app.post('/', (req, res) => {
            try {
                // Send a success response
                res.status(200).send('OK');
            } catch (error) {
                this.emit('log', { level: 'error', message: `callbackHandler: Error processing callback: ${error}` });
                console.error(`callbackHandler: Error processing callback: ${error}`);
                res.status(500).send('Error processing callback');
            }
        });
    }


}

// Export a singleton instance
export const callbackHandler = new CallbackHandler();
